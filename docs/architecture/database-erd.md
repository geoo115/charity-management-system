```mermaid
erDiagram
    %% User Management
    users {
        id SERIAL PK
        email VARCHAR(255) UK
        password_hash VARCHAR(255)
        first_name VARCHAR(100)
        last_name VARCHAR(100)
        phone VARCHAR(20)
        role user_role
        is_active BOOLEAN
        email_verified BOOLEAN
        created_at TIMESTAMP
        updated_at TIMESTAMP
    }

    user_profiles {
        id SERIAL PK
        user_id INT FK
        date_of_birth DATE
        address TEXT
        postcode VARCHAR(10)
        emergency_contact_name VARCHAR(200)
        emergency_contact_phone VARCHAR(20)
        dietary_requirements TEXT
        medical_conditions TEXT
        created_at TIMESTAMP
        updated_at TIMESTAMP
    }

    %% Help Request System
    help_requests {
        id SERIAL PK
        user_id INT FK
        category help_category
        priority priority_level
        title VARCHAR(255)
        description TEXT
        location VARCHAR(500)
        postcode VARCHAR(10)
        status request_status
        assigned_volunteer_id INT FK
        created_at TIMESTAMP
        updated_at TIMESTAMP
        resolved_at TIMESTAMP
    }

    help_request_updates {
        id SERIAL PK
        help_request_id INT FK
        user_id INT FK
        update_type VARCHAR(50)
        content TEXT
        created_at TIMESTAMP
    }

    %% Volunteer Management
    volunteer_applications {
        id SERIAL PK
        user_id INT FK
        skills TEXT
        availability TEXT
        experience TEXT
        references TEXT
        status application_status
        reviewed_by INT FK
        created_at TIMESTAMP
        reviewed_at TIMESTAMP
    }

    volunteer_shifts {
        id SERIAL PK
        volunteer_id INT FK
        shift_type VARCHAR(100)
        start_time TIMESTAMP
        end_time TIMESTAMP
        location VARCHAR(500)
        description TEXT
        status shift_status
        created_at TIMESTAMP
    }

    volunteer_hours {
        id SERIAL PK
        volunteer_id INT FK
        shift_id INT FK
        hours_worked DECIMAL(4,2)
        activity_description TEXT
        logged_at TIMESTAMP
    }

    %% Donation System
    donations {
        id SERIAL PK
        donor_id INT FK
        donation_type donation_type
        amount DECIMAL(10,2)
        currency VARCHAR(3)
        payment_method VARCHAR(50)
        payment_reference VARCHAR(255)
        campaign_id INT FK
        message TEXT
        anonymous BOOLEAN
        status donation_status
        processed_at TIMESTAMP
        created_at TIMESTAMP
    }

    donation_campaigns {
        id SERIAL PK
        name VARCHAR(255)
        description TEXT
        target_amount DECIMAL(12,2)
        current_amount DECIMAL(12,2)
        start_date DATE
        end_date DATE
        is_active BOOLEAN
        created_by INT FK
        created_at TIMESTAMP
    }

    in_kind_donations {
        id SERIAL PK
        donation_id INT FK
        item_category VARCHAR(100)
        item_description TEXT
        quantity INT
        estimated_value DECIMAL(8,2)
        condition item_condition
        pickup_required BOOLEAN
        pickup_address TEXT
        status donation_status
    }

    %% Communication System
    notifications {
        id SERIAL PK
        user_id INT FK
        title VARCHAR(255)
        message TEXT
        type notification_type
        channel notification_channel
        status notification_status
        sent_at TIMESTAMP
        read_at TIMESTAMP
        created_at TIMESTAMP
    }

    message_templates {
        id SERIAL PK
        name VARCHAR(100)
        subject VARCHAR(255)
        body TEXT
        template_type VARCHAR(50)
        created_by INT FK
        is_active BOOLEAN
        created_at TIMESTAMP
    }

    %% Document Management
    documents {
        id SERIAL PK
        user_id INT FK
        filename VARCHAR(255)
        original_filename VARCHAR(255)
        file_size BIGINT
        mime_type VARCHAR(100)
        document_type VARCHAR(50)
        related_entity VARCHAR(50)
        related_entity_id INT
        is_public BOOLEAN
        created_at TIMESTAMP
    }

    %% Audit System
    audit_logs {
        id SERIAL PK
        user_id INT FK
        action VARCHAR(100)
        entity_type VARCHAR(100)
        entity_id INT
        old_values JSONB
        new_values JSONB
        ip_address INET
        user_agent TEXT
        created_at TIMESTAMP
    }

    %% Feedback System
    feedback {
        id SERIAL PK
        user_id INT FK
        category feedback_category
        subject VARCHAR(255)
        message TEXT
        rating INT
        status feedback_status
        created_at TIMESTAMP
        responded_at TIMESTAMP
    }

    %% Emergency System
    emergency_alerts {
        id SERIAL PK
        created_by INT FK
        title VARCHAR(255)
        message TEXT
        severity severity_level
        target_audience VARCHAR(100)
        expiry_date TIMESTAMP
        is_active BOOLEAN
        created_at TIMESTAMP
    }

    %% Relationships
    users ||--o{ user_profiles : has
    users ||--o{ help_requests : creates
    users ||--o{ help_request_updates : makes
    users ||--o{ volunteer_applications : submits
    users ||--o{ volunteer_shifts : assigned_to
    users ||--o{ volunteer_hours : logs
    users ||--o{ donations : makes
    users ||--o{ donation_campaigns : creates
    users ||--o{ notifications : receives
    users ||--o{ message_templates : creates
    users ||--o{ documents : uploads
    users ||--o{ audit_logs : generates
    users ||--o{ feedback : provides
    users ||--o{ emergency_alerts : creates

    help_requests ||--o{ help_request_updates : has
    help_requests }o--|| users : assigned_volunteer

    volunteer_shifts ||--o{ volunteer_hours : tracked_in
    volunteer_applications }o--|| users : reviewed_by

    donations }o--o| donation_campaigns : part_of
    donations ||--o{ in_kind_donations : contains

    %% Enums
    %% user_role: visitor, donor, volunteer, staff, admin
    %% help_category: food_assistance, general_support
    %% priority_level: low, medium, high, urgent
    %% request_status: pending, assigned, in_progress, completed, cancelled
    %% application_status: pending, approved, rejected, under_review
    %% shift_status: scheduled, in_progress, completed, cancelled
    %% donation_type: monetary, in_kind
    %% donation_status: pending, completed, failed, refunded
    %% item_condition: new, good, fair, poor
    %% notification_type: help_request, donation, volunteer, system
    %% notification_channel: email, sms, push, websocket
    %% notification_status: pending, sent, failed, read
    %% feedback_category: general, bug_report, feature_request, complaint
    %% feedback_status: open, in_progress, resolved, closed
    %% severity_level: low, medium, high, critical
```