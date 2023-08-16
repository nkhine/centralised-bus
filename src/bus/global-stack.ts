import path from 'path';
import { StackProps, RemovalPolicy, Duration } from 'aws-cdk-lib';
import { CfnEventBusPolicy, EventBus, Rule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { CfnRegistry } from 'aws-cdk-lib/aws-eventschemas';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { EventBusTarget } from '../constructs/event-bus/event-bus';
import TaggingStack from '../tagging';

interface GlobalBusStackProps extends StackProps {
  readonly localAccounts: string[];
  readonly logsAccountEventBusArn: string;
}

export class GlobalBusStack extends TaggingStack {
  readonly globalBus: EventBus;

  constructor(scope: Construct, id: string, props: GlobalBusStackProps) {
    super(scope, id, props);

    this.globalBus = new EventBus(this, 'GlobalBus', {
      eventBusName: `GlobalBus-${this.account}-${this.region}`,
    });

    // Schema registry for the GlobalBus
    new CfnRegistry(this, 'GlobalBusRegsitry', {
      description: 'Schema Registry for the GlobalBus',
      registryName: `GlobalBusRegistry-${this.account}-${this.region}`,
    });

    // Allow all accounts in the `accounts` array to write to the global bus
    for (let account of props.localAccounts) {
      // Allow source account to write to this account's event bus
      new CfnEventBusPolicy(
        this,
        `LocalToGlobalBusPermissionPolicy-${account}`,
        {
          statementId: `GrantLocalAccountToWriteToGlobalBus${account}`,
          action: 'events:PutEvents',
          eventBusName: this.globalBus.eventBusName,
          principal: account,
        },
      );
    }

    new LogGroup(this, 'GlobalLogGroup', {
      logGroupName: `GlobalBus-LogGroup-${this.account}-${this.region}`,
      // TODO: Review removalPolicy and remove if required
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // The lambda function and event bridge rule are added here
    // even if this rule is not added in local accounts
    {
      // Add the lambda function which'll listen to `CreateAccessKey` events in global bus and erase
      // the credentials from local bus accounts
      const createAccessKeyLambda = new Function(
        this,
        'CreateAccessKeyLambda',
        {
          runtime: Runtime.GO_1_X,
          handler: 'dist/lambda/remove-secret-key',
          timeout: Duration.seconds(60),
          memorySize: 256,
          code: Code.fromAsset(
            path.join(__dirname, '..', '..', 'dist', 'remove-secret-key.zip'),
          ),
        },
      );

      new Rule(this, 'CreateAccessKeyRule', {
        enabled: true,
        description: 'Rule to run remove-secret-key on CreateAccessKey Events',
        eventBus: this.globalBus,
        eventPattern: {
          account: props.localAccounts,
          source: ['aws.cloudtrail'],
          detailType: ['AWSAPI_Call'],
          detail: {
            eventName: ['CreateAccessKey'],
          },
        },
        targets: [
          new LambdaFunction(createAccessKeyLambda, {
            retryAttempts: 3,
          }),
        ],
      });

      // Write codepipeline events to the logs stack
      new Rule(this, 'CodePipelineRule', {
        enabled: true,
        description:
          'Write codepipeline stage change events to event bus in logs account',
        eventBus: this.globalBus,
        eventPattern: {
          source: ['aws.codepipeline'],
          detailType: ['CodePipeline Stage Execution State Change'],
        },
        targets: [
          new EventBusTarget({
            eventBus: EventBus.fromEventBusArn(
              this,
              'LogsAccountCodepipelineEventBus',
              props.logsAccountEventBusArn,
            ),
          }),
        ],
      });
    }
  }
}
