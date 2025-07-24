class AddSubtaskFieldsToTasks < ActiveRecord::Migration[8.0]
  def change
    add_column :tasks, :task_group_id, :string
    add_column :tasks, :is_subtask, :boolean, default: false, null: false
    add_column :tasks, :position, :integer, default: 0
    
    add_index :tasks, :task_group_id
    add_index :tasks, [:task_group_id, :position]
    add_index :tasks, :is_subtask
  end
end
