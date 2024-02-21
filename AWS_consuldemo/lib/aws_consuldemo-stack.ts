import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';

export class AwsConsuldemoStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 📦 VPC
    const vpc = new ec2.Vpc(this, 'consuldemo-vpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      natGateways: 0,
      subnetConfiguration: [
        {name: 'public', cidrMask: 24, subnetType: ec2.SubnetType.PUBLIC},
      ],
    });

    // 📃 Security Group
    const consuldemoSG = new ec2.SecurityGroup(this, 'consuldemo-webserver-sg', {
      vpc,
      allowAllOutbound: true,
    });

    consuldemoSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22),
      'allow SSH access from anywhere, with key',
    );

    consuldemoSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow HTTP traffic from anywhere',
    );

    consuldemoSG.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'allow HTTPS traffic from anywhere',
    );

    // 👮‍♀️ IAM Role
    const consuldemoRole = new iam.Role(this, 'consuldemo-role', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3ReadOnlyAccess'),
      ],
    });

    // 🔑 Import the SSH key - first create a key pair in the ec2 dashboard.
    const keyPair = ec2.KeyPair.fromKeyPairName(
      this,
      'key-pair',
      'devconsuldemo-key-pair',
    );

    // 💿 Specify Ubuntu 20.04 image from Canonical Public SSM Parameter Store
    const ubuntu = ec2.MachineImage.fromSsmParameter(
      '/aws/service/canonical/ubuntu/server/focal/stable/current/amd64/hvm/ebs-gp2/ami-id'
    )

    // 🖥️ create the web server EC2 Instance
    const consuldemoserver = new ec2.Instance(this, 'cosuldemo-ec2', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      role: consuldemoRole,
      securityGroup: consuldemoSG,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.XLARGE2 // as specs state 32GB RAM
      ),
      machineImage: ubuntu,
      keyPair: keyPair,
    });

    // 🖥️ create the ansible master EC2 Instance
    const consulcmaster = new ec2.Instance(this, 'consulmaster-ec2', {
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      role: consuldemoRole,
      securityGroup: consuldemoSG,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.NANO
      ),
      machineImage: ubuntu,
      keyPair: keyPair,
    });
  }
}