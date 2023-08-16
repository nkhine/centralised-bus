const { AwsCdkTypeScriptApp } = require('projen');
const project = new AwsCdkTypeScriptApp({
  cdkVersion: '2.60.0',
  cdkVersionPinning: false,
  defaultReleaseBranch: 'main',
  name: 'centralised-bus',
  description:
    'This project uses Amazon EventBridge to build a centralised event bus for connecting applications and AWS services. EventBridge allows for the creation of pipes to route events and transform them, as well as being fully managed and able to handle large volumes of events at a low cost.',
  authorName: 'Norman Khine',
  authorEmail: 'norman.khine@ohme-ev.com',
  repository: 'https://github.com/OhmEnergy/ohme-infra',
  gitignore: ['*/dist/*'],
  authorOrganization: 'OhmEnergy',
  entrypoint: 'bin/main.ts',
  licensed: false,
  gitignore: ['!lib/*.ts', '!bin/*.ts'],
  cdkDependencies: [],
  deps: [
    'yaml',
    // '@cloudcomponents/cdk-codepipeline-slack',
  ] /* Runtime dependencies of this module. */,
  devDeps: ['@types/node', 'cdk-dia'] /* Build dependencies for this module. */,
  context: {},
  dependabot: false,
  buildWorkflow: false,
  releaseWorkflow: false,
  github: false,
  jest: false,
});

project.gitignore.removePatterns('/bin', '/src');
project.gitignore.addPatterns('*.event', 'docs/diagram.dot');
project.tsconfig.compilerOptions.rootDir = 'source';
project.tsconfig.include = ['source/**/*.ts'];

project.compileTask.prependExec('make');
project.cdkConfig.app = 'npx ts-node --prefer-ts-exts bin/main.ts';
project.synth();