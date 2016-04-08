module.exports = {
    "_meta":      {
        "model": "Discord\\ApiBundle\\Document\\Server"
    },
    "properties": {
        "billing":       {
            "properties": {
                "active": {
                    "type": "boolean"
                },
                "bid":    {
                    "type": "long"
                }
            }
        },
        "custom_url":    {
            "type": "string"
        },
        "enabled":       {
            "type": "boolean"
        },
        "icon":          {
            "type": "string"
        },
        "id":            {
            "type": "string"
        },
        "identifier":    {
            "type": "string"
        },
        "insert_date":   {
            "type":   "date",
            "format": "dateOptionalTime"
        },
        "invite_code":   {
            "type": "string"
        },
        "members":       {
            "type": "long"
        },
        "modified_date": {
            "type":   "date",
            "format": "dateOptionalTime"
        },
        "name":          {
            "type": "string"
        },
        "online":        {
            "type": "long"
        },
        "owner":         {
            "type": "string"
        },
        "premium":       {
            "type": "boolean"
        },
        "private":       {
            "type": "boolean"
        },
        "region":        {
            "type": "string"
        }
    }
};
