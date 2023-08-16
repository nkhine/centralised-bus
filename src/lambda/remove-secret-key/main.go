package main

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/aws/aws-lambda-go/lambda"
	"github.com/davecgh/go-spew/spew"
	"github.com/sirupsen/logrus"
)

type EventData struct {
	SecretAccessKey string `json:"SecretAccessKey"`
	// other fields
}

func main() {
	logger := logrus.New()
	logger.Formatter = &logrus.JSONFormatter{
		DisableTimestamp:  true,
		DisableHTMLEscape: true,
		FieldMap: logrus.FieldMap{
			logrus.FieldKeyTime: "timestamp",
		},
	}
	lambda.Start(handleEvent(logger))
}

// TODO: Figure out what response input looks like
// Add code to erase credentials from local account
// This will work either with cross account roles _or_ resource based poliicies
func handleEvent(logger *logrus.Logger) func(context.Context, json.RawMessage) ([]byte, error) {
	return func(ctx context.Context, event json.RawMessage) ([]byte, error) {

		spew.Dump(event)

		var data EventData
		if err := json.Unmarshal(event, &data); err != nil {
			logger.WithError(err).Error("failed to unmarshal event data")
			return nil, fmt.Errorf("failed to unmarshal event data: %w", err)
		}

		// remove the SecretAccessKey field
		data.SecretAccessKey = ""

		// marshal the modified event data
		modifiedEvent, err := json.Marshal(data)
		if err != nil {
			logger.WithError(err).Error("failed to marshal modified event data")
			return nil, fmt.Errorf("failed to marshal modified event data: %w", err)
		}

		return modifiedEvent, nil
	}
}
