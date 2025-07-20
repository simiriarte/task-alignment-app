class AddParentTaskIdToTasks < ActiveRecord::Migration[8.0]
  def change
    add_reference :tasks, :parent_task, null: true, foreign_key: { to_table: :tasks }, index: true
  end
end
