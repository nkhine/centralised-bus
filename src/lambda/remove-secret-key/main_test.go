package main

import (
	"encoding/json"
	"testing"

	"github.com/sirupsen/logrus"
)

func TestRemoveSecretKey(t *testing.T) {
	// create a logger
	logger := logrus.New()
	logger.Formatter = &logrus.JSONFormatter{
		DisableTimestamp:  true,
		DisableHTMLEscape: true,
		FieldMap: logrus.FieldMap{
			logrus.FieldKeyTime: "timestamp",
		},
	}

	// create sample event data
	eventData := []byte(`{
		"SecretAccessKey": "abc123",
		// other fields
	}`)

	// invoke the remove-secret-key function
	modifiedEvent, err := handleEvent(logger, eventData)
	if err != nil {
		t.Fatalf("failed to invoke remove-secret-key function: %v", err)
	}

	// parse the modified event data
	var data EventData
	if err := json.Unmarshal(modifiedEvent, &data); err != nil {
		t.Fatalf("failed to unmarshal modified event data: %v", err)
	}

	// verify that the SecretAccessKey field has been removed
	if data.SecretAccessKey != "" {
		t.Errorf("expected SecretAccessKey field to be removed, got %q", data.SecretAccessKey)
	}
}
