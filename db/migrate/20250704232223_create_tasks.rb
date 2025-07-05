class CreateTasks < ActiveRecord::Migration[8.0]
  def change
    create_table :tasks do |t|
      t.string :title, null: false
      t.string :status, null: false, default: 'unrated'
      t.integer :energy
      t.integer :simplicity
      t.integer :impact
      t.integer :cognitive_density, null: false
      t.decimal :estimated_hours, null: false, precision: 5, scale: 2
      t.decimal :score, precision: 5, scale: 2
      t.text :notes
      t.datetime :due_date
      t.integer :actual_energy
      t.integer :actual_simplicity
      t.integer :actual_impact
      t.decimal :time_spent, precision: 5, scale: 2
      t.boolean :is_focus_task, null: false, default: false
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
  end
end
