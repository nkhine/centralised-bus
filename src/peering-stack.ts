import { PhysicalName, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { IPeer, Port, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import {
  AccountPrincipal,
  Effect,
  IRole,
  PolicyDocument,
  PolicyStatement,
  Role,
} from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Env } from './config';

export interface PeeringStackProps extends StackProps {
  readonly peeredAccountEnv: Env;
  readonly accepterVpcConfig: {
    readonly vpc: {
      readonly id: string;
    };
    readonly availabilityZones: string[];
    readonly cidr: string;
  };
  readonly peeredVpcSecurityGroupIngressRules: SecurityGroupIngressRule[];
}

export interface SecurityGroupIngressRule {
  readonly peer: IPeer;
  readonly connection: Port;
  readonly description?: string;
  readonly remoteRule?: boolean;
}

export class PeeringStack extends Stack {
  readonly peeringCrossAccountRole: IRole;
  readonly dataAccountCrossAccountRole: IRole;

  constructor(scope: Construct, id: string, props: PeeringStackProps) {
    super(scope, id, props);

    const vpc = Vpc.fromVpcAttributes(this, 'Vpc', {
      vpcId: props.accepterVpcConfig.vpc.id,
      vpcCidrBlock: props.accepterVpcConfig.cidr,
      availabilityZones: props.accepterVpcConfig.availabilityZones,
    });

    const securityGroup = new SecurityGroup(this, 'PeeringSecurityGroup', {
      vpc: vpc,
    });

    for (let rule of props.peeredVpcSecurityGroupIngressRules) {
      securityGroup.addIngressRule(
        rule.peer,
        rule.connection,
        rule.description,
        rule.remoteRule,
      );
    }

    // Only accept peering requests from the peered account
    this.peeringCrossAccountRole = new Role(this, 'PeeringRole', {
      roleName: PhysicalName.GENERATE_IF_NEEDED,
      assumedBy: new AccountPrincipal(props.peeredAccountEnv.account),
      description:
        'Allow other account to peer with VPCs in this account, Add Routes in the private subnets of Peered VPC and enable DNS resolution of hosts in this VPC from the peered VPC',
      inlinePolicies: {
        PeeringPolicy: new PolicyDocument({
          assignSids: true,
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['ec2:AcceptVpcPeeringConnection'],
              resources: [
                `arn:aws:ec2:${Stack.of(this).region}:${
                  Stack.of(this).account
                }:vpc-peering-connection/*`,
                // TODO: Specify specific vpc arns that should be allowed to peer with the vpcs in other account
                `arn:aws:ec2:${Stack.of(this).region}:${
                  Stack.of(this).account
                }:vpc/*`,
              ],
            }),
          ],
        }),
        AccepterAccountUpdationPolicy: new PolicyDocument({
          assignSids: true,
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                // This permission is required to let requester VPC resolve DNS address in accepter VPC
                'ec2:ModifyVpcPeeringConnectionOptions',
                // This permission is required to allow requester account to create routes in this account's private subnets
                'ec2:CreateRoute',
                'ec2:DeleteRoute',
                'ec2:DescribeSubnets',
                'ec2:DescribeRouteTables',
              ],
              resources: ['*'],
            }),
          ],
        }),
      },
    });

    this.peeringCrossAccountRole.applyRemovalPolicy(RemovalPolicy.DESTROY);

    this.dataAccountCrossAccountRole = new Role(
      this,
      'VpcAssociationAuthorizationCrossAccountRole',
      {
        assumedBy: new AccountPrincipal(props.peeredAccountEnv.account),
        roleName: PhysicalName.GENERATE_IF_NEEDED,
        inlinePolicies: {
          route53: new PolicyDocument({
            assignSids: true,
            minimize: true,
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'route53:CreateVPCAssociationAuthorization',
                  'route53:DeleteVPCAssociationAuthorization',
                  'route53:ListVPCAssociationAuthorizations',
                ],
                resources: ['*'],
              }),
            ],
          }),
        },
      },
    );
    this.dataAccountCrossAccountRole.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }
}
