import { StackProps, Stage, StageProps, SecretValue } from 'aws-cdk-lib';
import { GitHubTrigger } from 'aws-cdk-lib/aws-codepipeline-actions';
import {
  CodePipeline,
  CodePipelineSource,
  ManualApprovalStep,
  ShellStep,
} from 'aws-cdk-lib/pipelines';
import { Construct } from 'constructs';
import { GlobalBusStack } from './bus/global-stack';
import { LocalBusStack } from './bus/local-stack';
import { AppEnvConfig, RepoEntry, Rules } from './config';
import { GithubSource } from './constructs/github-trigger';
import TaggingStack from './tagging';

interface CicdStageProps extends StageProps {
  readonly config: AppEnvConfig;

  // sharedRules is a *COPY* of the original object
  // Any mention of the variables `GlobalBus` will be replaced with
  // the global bus created in this deployment
  // This modification must not effect the original object
  readonly sharedRules?: Rules;
}

class CicdStage extends Stage {
  constructor(scope: Construct, id: string, props: CicdStageProps) {
    super(scope, id, props);

    // Deploy stacks related to cross account bus
    const globalStack = new GlobalBusStack(this, 'GlobalStack', {
      env: props.config.env,
      logsAccountEventBusArn: props.config.codepipeline.logsAccountEventBusArn,
      localAccounts: [
        ...new Set(props.config.accounts.map((account) => account.env.account)),
      ],
    });

    // Replace every single variable in input to arn of globalbus
    if (props.sharedRules != undefined) {
      for (let rule in props.sharedRules!) {
        if (
          !('destinations' in props.sharedRules[rule]) ||
          props.sharedRules[rule].destinations == null ||
          !('bus' in props.sharedRules[rule].destinations) ||
          props.sharedRules[rule].destinations.bus == null
        ) {
          continue;
        }

        let destination = props.sharedRules[rule].destinations;
        for (let dest of destination.bus!) {
          if (dest.arn == 'GlobalBus') {
            dest.arn = globalStack.globalBus.eventBusArn;
          }
        }
      }
    }

    // Replace every single variable in input to arn of globalbus
    for (let entry of props.config.accounts) {
      if (entry.rules == undefined) {
        continue;
      }

      for (let rule in entry.rules) {
        if (
          !('destinations' in entry.rules[rule]) ||
          entry.rules[rule].destinations == null ||
          !('bus' in entry.rules[rule].destinations) ||
          entry.rules[rule].destinations.bus == null
        ) {
          continue;
        }

        let destination = entry.rules[rule].destinations;
        for (let dest of destination.bus!) {
          if (dest.arn == 'GlobalBus') {
            dest.arn = globalStack.globalBus.eventBusArn;
          }
        }
      }
    }

    for (let entry of props.config.accounts) {
      // TODO: Check what permissions we need to configure to make this work
      // cross account and cross region
      // TODO: Make an enum of supported services
      // then add destination rules in local stacks for each supported service
      // TODO: Write a custom resource to make this work with cloudwatch event rules
      new LocalBusStack(this, `LocalStack-${entry.env.account}-${entry.env.region}`, {
        env: entry.env,
        rules: entry.rules,
        name: entry.env.name,
        globalBusArn: globalStack.globalBus.eventBusArn,
        sharedRules: props.sharedRules,
      });

      // TODO: If an entry specifies event bus as a target
      // then we have to deploy a stack in that account/region
      // and configure _that_ event bus to allow event bus from localStack to write to it
    }
  }
}

interface CicdStackProps extends StackProps {
  readonly githubTokenArn: string;
  readonly repo: RepoEntry;
  readonly production: AppEnvConfig;
  sharedRules?: Rules;
}

export class CicdStack extends TaggingStack {
  constructor(scope: Construct, id: string, props: CicdStackProps) {
    super(scope, id, props);
    // Webhook trigger code
    const oauthToken = SecretValue.secretsManager(props.githubTokenArn);
    const pipeline = new CodePipeline(this, 'CDKPipeline', {
      dockerEnabledForSynth: true,
      pipelineName: props.repo.pipelineName,
      crossAccountKeys: true,
      synth: new ShellStep('Synth', {
        input: CodePipelineSource.gitHub(
          `${props.repo.owner}/${props.repo.repo}`,
          props.repo.branch,
          {
            authentication: oauthToken,
            trigger: GitHubTrigger.NONE,
          },
        ),
        env: {
          GO_VERSION: '1.19',
        },
        installCommands: [
          'wget https://storage.googleapis.com/golang/go${GO_VERSION}.linux-amd64.tar.gz',
          'tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz',
          'export PATH="/usr/local/go/bin:$PATH" && export GOPATH="$HOME/go" && export PATH="$GOPATH/bin:$PATH"',
        ],
        commands: [
          `cd ./${props.repo.path}`,
          // 'make',

          'yarn install --immutable --immutable-cache --check-cache',
          'npm run build',
          'npx cdk synth',
        ],
        primaryOutputDirectory: `./${props.repo.path}/cdk.out`,
      }),
    });

    pipeline.addStage(
      new CicdStage(this, 'Production', {
        env: props.production.env,
        config: props.production,
        sharedRules: props.sharedRules,
      }),
      {
        pre: [
          new ManualApprovalStep(
            'Approve deployment for the CentralisedBus infrastructure',
          ),
        ],
      },
    );

    pipeline.buildPipeline();

    const ghSource = new GithubSource(this, 'GithubTrigger', {
      branch: props.repo.branch,
      owner: props.repo.owner,
      repo: props.repo.repo,
      filters: [props.repo.path],
      githubTokenArn: props.githubTokenArn,
      codepipeline: pipeline.pipeline,
    });
    ghSource.node.addDependency(pipeline);
  }
}
