class ProfileController < ApplicationController
  before_action :authenticate_user!

  def update_photo
    if params[:remove_photo] == "true"
      # Remove photo
      current_user.update!(profile_photo: nil)
      render json: { success: true, photo_url: nil }
    elsif params[:profile_photo].present?
      # Upload new photo
      uploaded_file = params[:profile_photo]

      # Basic validation
      unless uploaded_file.respond_to?(:read)
        render json: { success: false, error: "Invalid file" }
        return
      end

      # Check file type
      unless uploaded_file.content_type.start_with?("image/")
        render json: { success: false, error: "File must be an image" }
        return
      end

      # Check file size (5MB max)
      if uploaded_file.size > 5.megabytes
        render json: { success: false, error: "File must be less than 5MB" }
        return
      end

      # For now, we'll convert to base64 data URI for simplicity
      # In production, you'd want to use a proper file storage service
      begin
        file_data = uploaded_file.read
        file_extension = uploaded_file.original_filename.split(".").last.downcase

        # Only allow common image formats
        unless [ "jpg", "jpeg", "png", "gif", "webp" ].include?(file_extension)
          render json: { success: false, error: "Unsupported file format" }
          return
        end

        # Convert to base64 data URI
        base64_data = Base64.strict_encode64(file_data)
        mime_type = uploaded_file.content_type
        data_uri = "data:#{mime_type};base64,#{base64_data}"

        # Update user's profile photo
        current_user.update!(profile_photo: data_uri)

        render json: { success: true, photo_url: data_uri }
      rescue => e
        Rails.logger.error "Profile photo upload error: #{e.message}"
        render json: { success: false, error: "Failed to process image" }
      end
    else
      render json: { success: false, error: "No photo provided" }
    end
  end
end
