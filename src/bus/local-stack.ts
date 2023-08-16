import { StackProps, RemovalPolicy } from 'aws-cdk-lib';
import { EventBus, IEventBus, Rule as EventRule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction, SqsQueue } from 'aws-cdk-lib/aws-events-targets';
import { Function } from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { Rules, Rule, AttachTo } from '../config';
import { EventBusTarget } from '../constructs/event-bus/event-bus';
import TaggingStack from '../tagging';

interface LocalBusStackProps extends StackProps {
  readonly name: string;
  readonly globalBusArn: string;
  readonly rules?: Rules;
  readonly sharedRules?: Rules;
}

export class LocalBusStack extends TaggingStack {
  constructor(scope: Construct, id: string, props: LocalBusStackProps) {
    super(scope, id, props);

    let customBus: IEventBus = new EventBus(this, 'LocalBus', {
      eventBusName: `LocalBus-${this.account}-${this.region}`,
    });
    let defaultBus = EventBus.fromEventBusArn(
      this,
      'DefaultBus',
      `arn:aws:events:${this.region}:${this.account}:event-bus/default`,
    );

    // Configure each local rule in the event bus
    for (let ruleStr in props.rules) {
      console.log(
        `Configuring local rules for ${ruleStr} in local event bus ${props.name}`,
      );
      let rule = props.rules[ruleStr];

      // Default to using the custom bus but
      // attach rule to default bus if it was specified in the config
      let bus = customBus;
      if (rule.attachTo == AttachTo.DefaultBus) {
        bus = defaultBus;
      }

      this.addBusDestination(ruleStr, rule, bus);
      this.addLambdaDestination(ruleStr, rule, bus);
      this.addSQSDestination(ruleStr, rule, bus);
    }

    // Configure each local rule in the event bus
    for (let ruleStr in props.sharedRules) {
      console.log(
        `Configuring shared rules for ${ruleStr} in local event bus ${props.name}`,
      );
      let rule = props.sharedRules[ruleStr];

      // Default to using the custom bus but
      // attach rule to default bus if it was specified in the config
      let bus = customBus;
      if (rule.attachTo == AttachTo.DefaultBus) {
        bus = defaultBus;
      }

      this.addBusDestination(ruleStr, rule, bus);
      this.addLambdaDestination(ruleStr, rule, bus);
      this.addSQSDestination(ruleStr, rule, bus);
    }

    new LogGroup(this, 'LocalLogGroup', {
      logGroupName: `LocalBus-LogGroup-${this.account}-${this.region}`,
      // TODO: Review removalPolicy and remove if required
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }

  addBusDestination(ruleStr: string, rule: Rule, bus: IEventBus) {
    if (rule.destinations == null || rule.destinations.bus == undefined) {
      return;
    }

    for (let dest of rule.destinations.bus) {
      new EventRule(this, `${ruleStr}bus${dest.name}Rule`, {
        enabled: true,
        eventBus: bus,
        targets: [
          new EventBusTarget({
            eventBus: EventBus.fromEventBusArn(
              this,
              `${ruleStr}bus${dest.name}Target`,
              dest.arn,
            ),
          }),
        ],
        description: `${ruleStr}/${dest.name} ${rule.description}`,
        eventPattern: dest.filter,
      });
    }
  }

  addLambdaDestination(ruleStr: string, rule: Rule, bus: IEventBus) {
    if (rule.destinations == null || rule.destinations.lambda == undefined) {
      return;
    }

    // Configure Lambda destinations
    for (let dest of rule.destinations.lambda) {
      new EventRule(this, `${ruleStr}lambda${dest.name}Rule`, {
        enabled: true,
        eventBus: bus,
        targets: [
          new LambdaFunction(
            Function.fromFunctionArn(
              this,
              `${ruleStr}lambda${dest.name}Target`,
              dest.arn,
            ),
            {
              // TODO: Configure parameters like DLQ here if needed
            },
          ),
        ],
        description: `${ruleStr}/${dest.name} ${rule.description}`,
        eventPattern: dest.filter,
      });
    }
  }

  addSQSDestination(ruleStr: string, rule: Rule, bus: IEventBus) {
    if (rule.destinations == null || rule.destinations.sqs == undefined) {
      return;
    }

    // Configure sqs destinations
    for (let dest of rule.destinations.sqs) {
      new EventRule(this, `${ruleStr}sqs${dest.name}Rule`, {
        enabled: true,
        eventBus: bus,
        targets: [
          new SqsQueue(
            Queue.fromQueueArn(
              this,
              `${ruleStr}sqs${dest.name}Target`,
              dest.arn,
            ),
          ),
        ],
        description: `${ruleStr}/${dest.name} ${rule.description}`,
        eventPattern: dest.filter,
      });
    }
  }
}
