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

  # Callbacks
  before_save :calculate_score_and_update_status

  # Subtask helper methods
  def has_subtasks?
    subtasks.any?
  end

  def is_subtask?
    parent_task_id.present?
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
end
