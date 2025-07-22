class AddParentTaskIdToTasks < ActiveRecord::Migration[8.0]
  def change
    add_column :tasks, :parent_task_id, :integer
  end
end
