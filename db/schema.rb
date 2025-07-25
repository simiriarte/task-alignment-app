# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_07_23_204911) do
  create_table "tasks", force: :cascade do |t|
    t.string "title", null: false
    t.string "status", default: "unrated", null: false
    t.integer "energy"
    t.integer "simplicity"
    t.integer "impact"
    t.integer "cognitive_density", null: false
    t.decimal "estimated_hours", precision: 5, scale: 2, null: false
    t.decimal "score", precision: 5, scale: 2
    t.text "notes"
    t.datetime "due_date"
    t.integer "actual_energy"
    t.integer "actual_simplicity"
    t.integer "actual_impact"
    t.decimal "time_spent", precision: 5, scale: 2
    t.boolean "is_focus_task", default: false, null: false
    t.integer "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "parent_task_id"
    t.string "task_group_id"
    t.boolean "is_subtask", default: false, null: false
    t.integer "position", default: 0
    t.index ["is_subtask"], name: "index_tasks_on_is_subtask"
    t.index ["task_group_id", "position"], name: "index_tasks_on_task_group_id_and_position"
    t.index ["task_group_id"], name: "index_tasks_on_task_group_id"
    t.index ["user_id"], name: "index_tasks_on_user_id"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "profile_photo"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "tasks", "users"
end
