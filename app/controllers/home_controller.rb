class HomeController < ApplicationController
  def index
    if user_signed_in?
      # Progressive disclosure: determine which sections should be active
      @has_unrated_tasks = current_user.tasks.where(status: "unrated").exists?
      @has_rated_tasks = current_user.tasks.where(status: "rated").exists?
      @has_parked_tasks = current_user.tasks.where(status: "parked").exists?
      @has_completed_tasks = current_user.tasks.where(status: "completed").exists?

      # Task counts for each section
      @unrated_count = current_user.tasks.where(status: "unrated").count
      @rated_count = current_user.tasks.where(status: "rated").count
      @parked_count = current_user.tasks.where(status: "parked").count
      @completed_count = current_user.tasks.where(status: "completed").count
    end
  end
end
