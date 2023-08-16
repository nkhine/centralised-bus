import * as events from 'aws-cdk-lib/aws-events';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct, IConstruct } from 'constructs';

/**
 * Configuration properties of an Event Bus event
 */
export interface EventBusProps {
  /**
   * The target event bus
   */
  readonly eventBus: events.IEventBus;

  /**
   * Role to be used to publish the event
   *
   * @default a new role is created.
   */
  readonly role?: iam.IRole;
}

/**
 * Notify an existing Event Bus of an event
 */
export class EventBusTarget implements events.IRuleTarget {
  private readonly eventBus: events.IEventBus;
  private readonly role?: iam.IRole;

  constructor(props: EventBusProps) {
    this.eventBus = props.eventBus;
    this.role = props.role;
  }

  bind(rule: events.IRule): events.RuleTargetConfig {
    if (this.role) {
      this.role.addToPrincipalPolicy(this.putEventStatement());
    }
    const role =
      this.role ?? singletonEventRole(rule, [this.putEventStatement()]);
    return {
      arn: this.eventBus.eventBusArn,
      role,
    };
  }

  private putEventStatement() {
    return new iam.PolicyStatement({
      actions: ['events:PutEvents'],
      resources: [this.eventBus.eventBusArn],
    });
  }
}

export function singletonEventRole(
  scope: IConstruct,
  policyStatements: iam.PolicyStatement[],
): iam.IRole {
  const id = 'EventsRole';
  const existing = scope.node.tryFindChild(id) as iam.IRole;
  if (existing) {
    return existing;
  }

  const role = new iam.Role(scope as Construct, id, {
    assumedBy: new iam.ServicePrincipal('events.amazonaws.com'),
  });

  policyStatements.forEach(role.addToPolicy.bind(role));

  return role;
}
