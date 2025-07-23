class RemoveParentTaskIdFromTasks < ActiveRecord::Migration[8.0]
  def change
    remove_column :tasks, :parent_task_id, :integer
  end
end
