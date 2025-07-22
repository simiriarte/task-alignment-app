class TasksController < ApplicationController
  before_action :authenticate_user!
  before_action :set_task, only: [ :show, :edit, :update, :destroy, :duplicate, :add_subtask ]

  # GET /tasks
  def index
    # Only show parent tasks (not subtasks) in the main dashboard
    @tasks = current_user.tasks.where(parent_task_id: nil).order(created_at: :desc)

    # Progressive disclosure: determine which sections should be active (only parent tasks)
    @has_unrated_tasks = current_user.tasks.where(status: "unrated", parent_task_id: nil).exists?
    @has_rated_tasks = current_user.tasks.where(status: "rated", parent_task_id: nil).exists?
    @has_parked_tasks = current_user.tasks.where(status: "parked", parent_task_id: nil).exists?
    @has_completed_tasks = current_user.tasks.where(status: "completed", parent_task_id: nil).exists?

    # Task counts for each section (only parent tasks)
    @unrated_count = current_user.tasks.where(status: "unrated", parent_task_id: nil).count
    @rated_count = current_user.tasks.where(status: "rated", parent_task_id: nil).count
    @parked_count = current_user.tasks.where(status: "parked", parent_task_id: nil).count
    @completed_count = current_user.tasks.where(status: "completed", parent_task_id: nil).count
    @total_tasks = current_user.tasks.where(parent_task_id: nil).count
  end

  # GET /tasks/1
  def show
  end

  # GET /tasks/new
  def new
    @task = current_user.tasks.build
  end

  # POST /tasks
  def create
    @task = current_user.tasks.build(task_params)

    if @task.save
      respond_to do |format|
        format.html { redirect_to @task, notice: "Task was successfully created." }
        format.json {
          if params[:inline]
            # For inline creation, return the task card HTML
            task_html = render_to_string(partial: "task_card", locals: { task: @task }, formats: [ :html ])
            unrated_count = current_user.tasks.where(status: "unrated").count
            render json: {
              success: true,
              task_html: task_html,
              unrated_count: unrated_count,
              task: @task.as_json(only: [ :id, :title, :status ])
            }
          else
            render json: { success: true, task: @task }
          end
        }
      end
    else
      respond_to do |format|
        format.html { render :new, status: :unprocessable_entity }
        format.json { render json: { success: false, errors: @task.errors.full_messages } }
      end
    end
  end

  # GET /tasks/1/edit
  def edit
  end

  # PATCH/PUT /tasks/1
  def update
    if @task.update(task_params)
      # Calculate updated counts in case status changed
      updated_counts = {
        unrated_count: current_user.tasks.where(status: "unrated").count,
        rated_count: current_user.tasks.where(status: "rated").count,
        parked_count: current_user.tasks.where(status: "parked").count,
        completed_count: current_user.tasks.where(status: "completed").count
      }
      
      respond_to do |format|
        format.html { redirect_to @task, notice: "Task was successfully updated." }
        format.json { 
          render json: { 
            success: true, 
            task: @task,
            counts: updated_counts
          } 
        }
      end
    else
      respond_to do |format|
        format.html { render :edit, status: :unprocessable_entity }
        format.json { render json: { success: false, errors: @task.errors.full_messages } }
      end
    end
  end

  # DELETE /tasks/1
  def destroy
    # Store task data before deletion for potential undo
    task_data = @task.attributes.except("id", "created_at", "updated_at")
    task_html = render_to_string(partial: "task_card", locals: { task: @task }, formats: [ :html ])

    @task.destroy
    
    # Calculate updated counts after deletion
    updated_counts = {
      unrated_count: current_user.tasks.where(status: "unrated").count,
      rated_count: current_user.tasks.where(status: "rated").count,
      parked_count: current_user.tasks.where(status: "parked").count,
      completed_count: current_user.tasks.where(status: "completed").count
    }
    
    respond_to do |format|
      format.html { redirect_to tasks_url, notice: "Task was successfully deleted." }
      format.json {
        render json: {
          success: true,
          message: "Task was successfully deleted.",
          task_data: task_data,
          task_html: task_html,
          counts: updated_counts
        }
      }
    end
  end

  # POST /tasks/1/duplicate
  def duplicate
    @new_task = current_user.tasks.build(@task.attributes.except("id", "created_at", "updated_at"))
    @new_task.title = "#{@new_task.title} (Copy)" if @new_task.title.present?

    if @new_task.save
      respond_to do |format|
        format.html { redirect_to tasks_url, notice: "Task was successfully duplicated." }
        format.json {
          task_html = render_to_string(partial: "task_card", locals: { task: @new_task }, formats: [ :html ])
          render json: {
            success: true,
            task_html: task_html,
            task: @new_task.as_json(only: [ :id, :title, :status ])
          }
        }
      end
    else
      respond_to do |format|
        format.html { redirect_to tasks_url, alert: "Failed to duplicate task." }
        format.json { render json: { success: false, errors: @new_task.errors.full_messages } }
      end
    end
  end

  # POST /tasks/brain_dump
  def brain_dump
    brain_dump_text = params[:brain_dump_text]

    if brain_dump_text.blank?
      respond_to do |format|
        format.html { redirect_to tasks_url, alert: "Please enter some text to create tasks from." }
        format.json { render json: { success: false, error: "Please enter some text to create tasks from." } }
      end
      return
    end

    # Split by newlines and reject blank lines
    task_lines = brain_dump_text.split("\n").map(&:strip).reject(&:blank?)

    if task_lines.empty?
      respond_to do |format|
        format.html { redirect_to tasks_url, alert: "No valid task lines found." }
        format.json { render json: { success: false, error: "No valid task lines found." } }
      end
      return
    end

    created_count = 0
    failed_tasks = []
    created_tasks = []

    task_lines.each do |line|
      task = current_user.tasks.build(
        title: line,
        status: "unrated",
        energy: nil,
        simplicity: nil,
        impact: nil,
        cognitive_density: 0,
        estimated_hours: 0
      )

      if task.save
        created_count += 1
        created_tasks << task
      else
        failed_tasks << { title: line, errors: task.errors.full_messages }
      end
    end

    if failed_tasks.empty?
      success_message = "Successfully created #{created_count} task#{'s' if created_count != 1}."
      
      # Calculate updated counts after brain dump
      updated_counts = {
        unrated_count: current_user.tasks.where(status: "unrated").count,
        rated_count: current_user.tasks.where(status: "rated").count,
        parked_count: current_user.tasks.where(status: "parked").count,
        completed_count: current_user.tasks.where(status: "completed").count
      }
      
      respond_to do |format|
        format.html { redirect_to tasks_url, notice: success_message }
        format.json {
          render json: {
            success: true,
            message: success_message,
            created_count: created_count,
            tasks: created_tasks.as_json(only: [ :id, :title, :status ]),
            counts: updated_counts
          }
        }
      end
    else
      error_message = "Created #{created_count} task#{'s' if created_count != 1}. Failed to create #{failed_tasks.length} task#{'s' if failed_tasks.length != 1}."
      respond_to do |format|
        format.html { redirect_to tasks_url, alert: error_message }
        format.json {
          render json: {
            success: false,
            error: error_message,
            created_count: created_count,
            failed_tasks: failed_tasks
          }
        }
      end
    end
  rescue => e
    error_message = "An error occurred while creating tasks: #{e.message}"
    respond_to do |format|
      format.html { redirect_to tasks_url, alert: error_message }
      format.json { render json: { success: false, error: error_message } }
    end
  end

  # POST /tasks/undo_delete
  def undo_delete
    task_data = params[:task_data]

    if task_data.blank?
      respond_to do |format|
        format.html { redirect_to tasks_url, alert: "No task data provided for undo." }
        format.json { render json: { success: false, error: "No task data provided for undo." } }
      end
      return
    end

    # Create new task with the provided data
    @task = current_user.tasks.build(task_data.permit(:title, :status, :energy, :simplicity, :impact,
                                                      :cognitive_density, :estimated_hours, :notes,
                                                      :due_date, :actual_energy, :actual_simplicity,
                                                      :actual_impact, :time_spent, :is_focus_task))

    if @task.save
      respond_to do |format|
        format.html { redirect_to tasks_url, notice: "Task successfully restored." }
        format.json {
          task_html = render_to_string(partial: "task_card", locals: { task: @task }, formats: [ :html ])
          render json: {
            success: true,
            message: "Task successfully restored.",
            task_html: task_html,
            task: @task.as_json(only: [ :id, :title, :status ])
          }
        }
      end
    else
      respond_to do |format|
        format.html { redirect_to tasks_url, alert: "Failed to restore task." }
        format.json { render json: { success: false, errors: @task.errors.full_messages } }
      end
    end
  rescue => e
    error_message = "An error occurred while restoring the task: #{e.message}"
    respond_to do |format|
      format.html { redirect_to tasks_url, alert: error_message }
      format.json { render json: { success: false, error: error_message } }
    end
  end

  # POST /tasks/1/add_subtask
  def add_subtask
    @subtask = current_user.tasks.build(
      title: "New subtask",
      status: 'unrated',
      cognitive_density: 0,
      estimated_hours: 0,
      parent_task_id: @task.id
    )

    if @subtask.save
      respond_to do |format|
        format.json {
          render json: {
            success: true,
            subtask: @subtask.as_json(only: [:id, :title, :status, :parent_task_id])
          }
        }
      end
    else
      respond_to do |format|
        format.json { render json: { success: false, error: @subtask.errors.full_messages.join(", ") } }
      end
    end
  end


  private

  # Use callbacks to share common setup or constraints between actions.
  def set_task
    @task = current_user.tasks.find(params[:id])
  end

  # Only allow a list of trusted parameters through.
  def task_params
    permitted_params = params.require(:task).permit(:title, :status, :energy, :simplicity, :impact,
                                                   :cognitive_density, :estimated_hours, :notes,
                                                   :due_date, :actual_energy, :actual_simplicity,
                                                   :actual_impact, :time_spent, :is_focus_task)

    # Parse due_date if it's provided in MM/DD or MM/DD/YYYY format
    if permitted_params[:due_date].present? && permitted_params[:due_date].is_a?(String)
      permitted_params[:due_date] = parse_due_date(permitted_params[:due_date])
    end

    permitted_params
  end

  def parse_due_date(date_string)
    return nil if date_string.blank?

    begin
      # Remove any extra whitespace and "due:" prefix if present
      date_string = date_string.strip.gsub(/^due:\s*/, "")
      return nil if date_string.blank?

      # Handle MM/DD/YYYY or MM/DD format
      parts = date_string.split("/")

      if parts.length == 2
        # MM/DD format - add current year
        month, day = parts.map(&:to_i)
        year = Date.current.year
        Date.new(year, month, day)
      elsif parts.length == 3
        # MM/DD/YYYY format
        month, day, year = parts.map(&:to_i)
        # Handle 2-digit years by assuming 20XX
        year = 2000 + year if year < 100
        Date.new(year, month, day)
      else
        # Try to parse as is (fallback)
        Date.parse(date_string)
      end
    rescue ArgumentError, Date::Error
      # If parsing fails, return nil
      nil
    end
  end
end
