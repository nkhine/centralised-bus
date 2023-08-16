import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export default class TaggingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    Tags.of(this).add('Application', 'centralised-bus');
    Tags.of(this).add('BusinessUnit', 'DevOps');
    Tags.of(this).add(
      'Description',
      'AWS CDKv2 centralised bus infrastructure',
    );
    Tags.of(this).add('TechnicalOwner', 'norman@khine.net');
    Tags.of(this).add('ManagedBy', 'centralised-bus');
    Tags.of(this).add('Tier', 'Infrastructure');
  }
}
