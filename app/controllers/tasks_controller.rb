class TasksController < ApplicationController
  before_action :authenticate_user!
  before_action :set_task, only: [ :show, :edit, :update, :destroy, :duplicate ]

  # GET /tasks
  def index
    @tasks = current_user.tasks.main_tasks.order(created_at: :desc)

    # Progressive disclosure: determine which sections should be active
    @has_unrated_tasks = current_user.tasks.main_tasks.where(status: "unrated").exists?
    @has_rated_tasks = current_user.tasks.main_tasks.where(status: "rated").exists?
    @has_parked_tasks = current_user.tasks.main_tasks.where(status: "parked").exists?
    @has_completed_tasks = current_user.tasks.main_tasks.where(status: "completed").exists?

    # Task counts for each section
    @unrated_count = current_user.tasks.main_tasks.where(status: "unrated").count
    @rated_count = current_user.tasks.main_tasks.where(status: "rated").count
    @parked_count = current_user.tasks.main_tasks.where(status: "parked").count
    @completed_count = current_user.tasks.main_tasks.where(status: "completed").count
    @total_tasks = current_user.tasks.main_tasks.count
  end

  # GET /tasks/1
  def show
    respond_to do |format|
      format.html
      format.json {
        render json: {
          task: @task.as_json(only: [:id, :title, :status])
        }
      }
    end
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
            unrated_count = current_user.tasks.main_tasks.where(status: "unrated").count
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
        unrated_count: current_user.tasks.main_tasks.where(status: "unrated").count,
        rated_count: current_user.tasks.main_tasks.where(status: "rated").count,
        parked_count: current_user.tasks.main_tasks.where(status: "parked").count,
        completed_count: current_user.tasks.main_tasks.where(status: "completed").count
      }
      
      respond_to do |format|
        format.html { redirect_to @task, notice: "Task was successfully updated." }
        format.json { 
          # Include updated task HTML for instant DOM updates
          task_html = render_to_string(partial: "task_card", locals: { task: @task }, formats: [:html])
          
          render json: { 
            success: true, 
            task: @task,
            task_html: task_html,
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
      unrated_count: current_user.tasks.main_tasks.where(status: "unrated").count,
      rated_count: current_user.tasks.main_tasks.where(status: "rated").count,
      parked_count: current_user.tasks.main_tasks.where(status: "parked").count,
      completed_count: current_user.tasks.main_tasks.where(status: "completed").count
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
        unrated_count: current_user.tasks.main_tasks.where(status: "unrated").count,
        rated_count: current_user.tasks.main_tasks.where(status: "rated").count,
        parked_count: current_user.tasks.main_tasks.where(status: "parked").count,
        completed_count: current_user.tasks.main_tasks.where(status: "completed").count
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

  # POST /tasks/:id/create_subtask
  def create_subtask
    @parent_task = current_user.tasks.find(params[:id])
    
    # Validate subtask title
    if params[:title].blank?
      render json: { success: false, error: "Subtask title cannot be empty" }, status: :unprocessable_entity
      return
    end
    
    # Get next position for ordering
    max_position = @parent_task.subtasks.maximum(:position) || -1
    
    @subtask = current_user.tasks.build(
      title: params[:title],
      task_group_id: @parent_task.task_group_id,
      is_subtask: true,
      position: max_position + 1,
      status: "unrated",
      cognitive_density: 0,
      estimated_hours: 0
    )
    
    if @subtask.save
      render json: {
        success: true,
        subtask: @subtask.as_json(only: [:id, :title, :is_subtask, :position]),
        subtask_html: render_to_string(partial: "subtask_item", locals: { subtask: @subtask }, formats: [:html])
      }
    else
      render json: { success: false, errors: @subtask.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error: "Task not found" }, status: :not_found
  end

  # PATCH /tasks/:id/toggle_subtask
  def toggle_subtask
    @subtask = current_user.tasks.find(params[:subtask_id])
    
    unless @subtask.is_subtask
      render json: { success: false, error: "Task is not a subtask" }, status: :unprocessable_entity
      return
    end
    
    # Toggle between unrated and completed for subtasks
    new_status = @subtask.status == "completed" ? "unrated" : "completed"
    
    if @subtask.update(status: new_status)
      render json: {
        success: true,
        status: new_status,
        subtask: @subtask.as_json(only: [:id, :title, :status])
      }
    else
      render json: { success: false, errors: @subtask.errors.full_messages }, status: :unprocessable_entity
    end
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error: "Subtask not found" }, status: :not_found
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

  # POST /tasks/:id/convert_to_main_task
  def convert_to_main_task
    @subtask = current_user.tasks.find(params[:id])
    
    unless @subtask.is_subtask
      render json: { success: false, error: "Task is not a subtask" }, status: :unprocessable_entity
      return
    end
    
    # Determine target status (default to "unrated" for Filter Tasks, or use specified status)
    target_status = params[:target_status] || "unrated"
    
    # Convert subtask to main task
    @subtask.update!(
      is_subtask: false,
      task_group_id: nil,
      position: nil,
      status: target_status,
      energy: nil,
      simplicity: nil,
      impact: nil
    )
    
    # Calculate updated counts
    updated_counts = {
      unrated_count: current_user.tasks.main_tasks.where(status: "unrated").count,
      rated_count: current_user.tasks.main_tasks.where(status: "rated").count,
      parked_count: current_user.tasks.main_tasks.where(status: "parked").count,
      completed_count: current_user.tasks.main_tasks.where(status: "completed").count
    }
    
    # Render the new task HTML
    task_html = render_to_string(partial: "task_card", locals: { task: @subtask }, formats: [:html])
    
    render json: {
      success: true,
      message: "Subtask successfully converted to main task",
      task: @subtask.as_json(only: [:id, :title, :status]),
      task_html: task_html,
      counts: updated_counts
    }
    
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error: "Subtask not found" }, status: :not_found
  rescue => e
    render json: { success: false, error: "Failed to convert subtask: #{e.message}" }, status: :internal_server_error
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
                                                   :actual_impact, :time_spent, :is_focus_task, :parent_task_id)

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
