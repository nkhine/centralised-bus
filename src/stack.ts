import { StackProps } from 'aws-cdk-lib';
import { IRole } from 'aws-cdk-lib/aws-iam';

import { Construct } from 'constructs';
import { AppEnvConfig, Env } from './config';
import TaggingStack from './tagging';

interface AppStackProps extends StackProps {
  readonly config: AppEnvConfig;
  readonly dataAccountCrossAccountRole: IRole;
}

export class AppStack extends TaggingStack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props);

    // define resources here...
    // const account = TaggingStack.of(this).account;
    // const region = TaggingStack.of(this).region;

    // end resource definitions
  }
}
