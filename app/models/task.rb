class Task < ApplicationRecord
  belongs_to :user

  # Associations for subtasks
  has_many :subtasks, -> { where(is_subtask: true).order(:position) },
           class_name: "Task",
           primary_key: :task_group_id,
           foreign_key: :task_group_id

  # Validations
  validates :title, presence: true
  validates :status, inclusion: { in: %w[unrated rated completed parked] }
  validates :cognitive_density, presence: true,
            numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 3 }
  validates :estimated_hours, presence: true,
            numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 8 }

  # Optional numeric validations (allow nil)
  validates :energy, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 10 },
            allow_nil: true
  validates :simplicity, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 10 },
            allow_nil: true
  validates :impact, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 10 },
            allow_nil: true
  validates :actual_energy, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 10 },
            allow_nil: true
  validates :actual_simplicity, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 10 },
            allow_nil: true
  validates :actual_impact, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: 10 },
            allow_nil: true
  validates :time_spent, numericality: { greater_than_or_equal_to: 0 }, allow_nil: true

  # Scopes
  scope :main_tasks, -> { where(is_subtask: false) }
  scope :subtasks_only, -> { where(is_subtask: true) }

  # Callbacks
  before_create :set_task_group_id, unless: :is_subtask
  before_save :calculate_score_and_update_status, unless: :is_subtask

  # Instance methods
  def completed?
    status == "completed"
  end

  def parent_task
    return nil unless is_subtask && task_group_id.present?
    Task.where(task_group_id: task_group_id, is_subtask: false).first
  end



  private

  def set_task_group_id
    self.task_group_id = SecureRandom.uuid
  end

  def calculate_score_and_update_status
    # Only calculate score if we have all three rating components
    if energy.present? && simplicity.present? && impact.present?
      self.score = (impact * 0.5) + (simplicity * 0.3) + (energy * 0.2)
      # Auto-change status to 'rated' when score is calculated (unless already completed or parked)
      if status == "unrated"
        self.status = "rated"
      end
    else
      # Reset score if we don't have all components
      self.score = nil
      # Reset status to unrated if we don't have a complete rating
      if status == "rated" && !all_rating_components_present?
        self.status = "unrated"
      end
    end
  end

  def all_rating_components_present?
    energy.present? && simplicity.present? && impact.present?
  end
end
