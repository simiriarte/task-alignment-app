class Task < ApplicationRecord
  belongs_to :user
  belongs_to :parent_task, class_name: 'Task', optional: true
  has_many :subtasks, class_name: 'Task', foreign_key: 'parent_task_id', dependent: :destroy

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

  # Subtask validations
  validate :prevent_circular_reference
  validate :prevent_subtask_of_subtask

  # Callbacks
  before_save :calculate_score_and_update_status

  # Subtask helper methods
  def has_subtasks?
    subtasks.any?
  end

  def is_subtask?
    parent_task_id.present?
  end

  def root_task
    is_subtask? ? parent_task : self
  end

  def subtask_completion_percentage
    return 0 unless has_subtasks?
    completed_subtasks = subtasks.where(status: 'completed').count
    (completed_subtasks.to_f / subtasks.count * 100).round
  end

  private

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

  def prevent_circular_reference
    return unless parent_task_id.present?

    if parent_task_id == id
      errors.add(:parent_task_id, "cannot be itself")
      return
    end

    # Check if the parent task is actually a subtask of this task (circular reference)
    current_parent = Task.find_by(id: parent_task_id)
    while current_parent&.parent_task_id.present?
      if current_parent.parent_task_id == id
        errors.add(:parent_task_id, "would create a circular reference")
        break
      end
      current_parent = current_parent.parent_task
    end
  end

  def prevent_subtask_of_subtask
    return unless parent_task_id.present?

    parent = Task.find_by(id: parent_task_id)
    if parent&.is_subtask?
      errors.add(:parent_task_id, "cannot create subtask of a subtask (only one level allowed)")
    end
  end
end
