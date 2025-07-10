module ApplicationHelper
  # Icon helper for consistent icon usage throughout the app
  # Uses Heroicons with customizable size and CSS classes
  def icon(name, variant: :outline, size: :md, css_class: nil, **options)
    size_classes = {
      xs: "h-3 w-3",
      sm: "h-4 w-4",
      md: "h-5 w-5",
      lg: "h-6 w-6",
      xl: "h-8 w-8",
      "2xl": "h-10 w-10"
    }

    default_classes = size_classes[size] || size_classes[:md]
    classes = [ default_classes, css_class ].compact.join(" ")

    heroicon(name, variant: variant, options: { class: classes, **options })
  end

  # Common task management icons - predefined for consistency
  def plus_icon(size: :md, css_class: nil, **options)
    icon("plus", size: size, css_class: css_class, **options)
  end

  def edit_icon(size: :md, css_class: nil, **options)
    icon("pencil", size: size, css_class: css_class, **options)
  end

  def calendar_icon(size: :md, css_class: nil, **options)
    icon("calendar", size: size, css_class: css_class, **options)
  end

  def document_icon(size: :md, css_class: nil, **options)
    icon("document-text", size: size, css_class: css_class, **options)
  end

  def chevron_right_icon(size: :md, css_class: nil, **options)
    icon("chevron-right", size: size, css_class: css_class, **options)
  end

  def chevron_down_icon(size: :md, css_class: nil, **options)
    icon("chevron-down", size: size, css_class: css_class, **options)
  end

  def chevron_left_icon(size: :md, css_class: nil, **options)
    icon("chevron-left", size: size, css_class: css_class, **options)
  end

  def delete_icon(size: :md, css_class: nil, **options)
    icon("trash", size: size, css_class: css_class, **options)
  end

  def check_icon(size: :md, css_class: nil, **options)
    icon("check", size: size, css_class: css_class, **options)
  end

  def star_icon(size: :md, css_class: nil, **options)
    icon("star", size: size, css_class: css_class, **options)
  end

  def user_icon(size: :md, css_class: nil, **options)
    icon("user", size: size, css_class: css_class, **options)
  end

  def settings_icon(size: :md, css_class: nil, **options)
    icon("cog-6-tooth", size: size, css_class: css_class, **options)
  end

  def home_icon(size: :md, css_class: nil, **options)
    icon("home", size: size, css_class: css_class, **options)
  end

  def menu_icon(size: :md, css_class: nil, **options)
    icon("bars-3", size: size, css_class: css_class, **options)
  end

  def close_icon(size: :md, css_class: nil, **options)
    icon("x-mark", size: size, css_class: css_class, **options)
  end

  def search_icon(size: :md, css_class: nil, **options)
    icon("magnifying-glass", size: size, css_class: css_class, **options)
  end

  def filter_icon(size: :md, css_class: nil, **options)
    icon("funnel", size: size, css_class: css_class, **options)
  end

  def sort_icon(size: :md, css_class: nil, **options)
    icon("arrows-up-down", size: size, css_class: css_class, **options)
  end

  def notification_icon(size: :md, css_class: nil, **options)
    icon("bell", size: size, css_class: css_class, **options)
  end

  def eye_icon(size: :md, css_class: nil, **options)
    icon("eye", size: size, css_class: css_class, **options)
  end

  def link_icon(size: :md, css_class: nil, **options)
    icon("link", size: size, css_class: css_class, **options)
  end

  def clock_icon(size: :md, css_class: nil, **options)
    icon("clock", size: size, css_class: css_class, **options)
  end

  def folder_icon(size: :md, css_class: nil, **options)
    icon("folder", size: size, css_class: css_class, **options)
  end

  def tag_icon(size: :md, css_class: nil, **options)
    icon("tag", size: size, css_class: css_class, **options)
  end

  def flag_icon(size: :md, css_class: nil, **options)
    icon("flag", size: size, css_class: css_class, **options)
  end

  def archive_icon(size: :md, css_class: nil, **options)
    icon("archive-box", size: size, css_class: css_class, **options)
  end

  def download_icon(size: :md, css_class: nil, **options)
    icon("arrow-down-tray", size: size, css_class: css_class, **options)
  end

  def upload_icon(size: :md, css_class: nil, **options)
    icon("arrow-up-tray", size: size, css_class: css_class, **options)
  end

  def share_icon(size: :md, css_class: nil, **options)
    icon("share", size: size, css_class: css_class, **options)
  end

  def copy_icon(size: :md, css_class: nil, **options)
    icon("square-2-stack", size: size, css_class: css_class, **options)
  end

  def heart_icon(size: :md, css_class: nil, **options)
    icon("heart", size: size, css_class: css_class, **options)
  end

  def info_icon(size: :md, css_class: nil, **options)
    icon("information-circle", size: size, css_class: css_class, **options)
  end

  def warning_icon(size: :md, css_class: nil, **options)
    icon("exclamation-triangle", size: size, css_class: css_class, **options)
  end

  def error_icon(size: :md, css_class: nil, **options)
    icon("x-circle", size: size, css_class: css_class, **options)
  end

  def success_icon(size: :md, css_class: nil, **options)
    icon("check-circle", size: size, css_class: css_class, **options)
  end
end
