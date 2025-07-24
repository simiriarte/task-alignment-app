class SetTaskGroupIdForExistingTasks < ActiveRecord::Migration[8.0]
  def up
    # Set task_group_id for existing tasks that don't have one
    Task.where(task_group_id: nil).find_each do |task|
      task.update_column(:task_group_id, SecureRandom.uuid)
    end
  end

  def down
    # Don't remove task_group_id values
  end
end
