class TasksController < ApplicationController
  before_action :authenticate_user!
  before_action :set_task, only: [:show, :edit, :update, :destroy]

  # GET /tasks
  def index
    @tasks = current_user.tasks.order(created_at: :desc)
    
    # Progressive disclosure: determine which sections should be active
    @has_unrated_tasks = current_user.tasks.where(status: 'unrated').exists?
    @has_rated_tasks = current_user.tasks.where(status: 'rated').exists?
    @has_parked_tasks = current_user.tasks.where(status: 'parked').exists?
    @has_completed_tasks = current_user.tasks.where(status: 'completed').exists?
    
    # Task counts for each section
    @unrated_count = current_user.tasks.where(status: 'unrated').count
    @rated_count = current_user.tasks.where(status: 'rated').count
    @parked_count = current_user.tasks.where(status: 'parked').count
    @completed_count = current_user.tasks.where(status: 'completed').count
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
      redirect_to @task, notice: 'Task was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  # GET /tasks/1/edit
  def edit
  end

  # PATCH/PUT /tasks/1
  def update
    if @task.update(task_params)
      redirect_to @task, notice: 'Task was successfully updated.'
    else
      render :edit, status: :unprocessable_entity
    end
  end

  # DELETE /tasks/1
  def destroy
    @task.destroy
    redirect_to tasks_url, notice: 'Task was successfully deleted.'
  end

  private

  # Use callbacks to share common setup or constraints between actions.
  def set_task
    @task = current_user.tasks.find(params[:id])
  end

  # Only allow a list of trusted parameters through.
  def task_params
    params.require(:task).permit(:title, :status, :energy, :simplicity, :impact, 
                                 :cognitive_density, :estimated_hours, :notes, 
                                 :due_date, :actual_energy, :actual_simplicity, 
                                 :actual_impact, :time_spent, :is_focus_task)
  end
end
