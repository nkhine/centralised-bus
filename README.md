# Summary

![API Infra](./docs/diagram.png "Infra")

## EventBridge as a Cross-Account Event Backbone

Two of the emerging best practices in modern AWS applications are:

* Use a separate AWS account per application
* Decouple communication between systems using events instead of point-to-point, synchronous communication.

## Event based communication

At any organisation, we can use Amazon EventBridge to easily connect our applications using data from our own apps, integrated SaaS apps, and AWS services. EventBridge lets us send and receive events between AWS services, SaaS apps, and our custom apps in a simple and reliable way.

EventBridge has some interesting features like event routing, transformation, scheduling, and replay. We can use EventBridge to route events to the right target based on rules we set, transform and enrich events before delivery, schedule event delivery for a specific time in the future, and replay events from a specific point in time.

One powerful feature of EventBridge is the ability to create EventBridge pipes. An EventBridge pipe is a one-way flow of events from a source to a destination. Pipes can be used to route events from multiple sources to a single destination, or to route events from a single source to multiple destinations. This allows us to build complex event-driven architectures that can scale and adapt to changing business needs.

EventBridge pipes can also be used to apply transformations to events as they flow through the pipe. For example, we can use a pipe to filter out events that do not meet certain criteria, or to add additional data to an event. This can be useful for ensuring that only relevant events are delivered to a destination, or for enriching events with data that is not available at the source.

One important consideration when using EventBridge pipes is compliance with data protection regulations, such as the General Data Protection Regulation (GDPR). When using pipes to transform or enrich events, it is important to ensure that personal data is handled in a way that is compliant with GDPR and other relevant regulations.

Event-based communication using EventBridge is different from point-to-point, synchronous communication in several ways. First, EventBridge allows us to decouple applications and services from each other, so that they can operate independently and asynchronously. This can be particularly useful when working with separate AWS accounts per application, as it allows us to communicate between accounts without the need to set up complex networking configurations.

Second, EventBridge enables us to build scalable and resilient architectures that can handle large volumes of events and recover gracefully from failures. This is in contrast to point-to-point communication, which can become brittle and difficult to scale as the number of connections grows.

By using EventBridge, we can leverage the power of event-based communication to build flexible, scalable, and reliable systems that can respond quickly to changes in our system, while also ensuring compliance with data protection regulations.

## Costs and scalability

One of the benefits of using EventBridge for event-based communication is that it is a fully managed service, which means that we don't have to worry about the underlying infrastructure. This can be particularly useful when working with separate AWS accounts per application, as it allows us to focus on building our applications and services, rather than managing infrastructure.

EventBridge is also designed to be highly scalable and able to handle large volumes of events. We are only charged for the number of events we process and the number of active event buses we have, which means that we can scale our event-based architectures to meet the needs of our business without incurring additional costs.

By using EventBridge, we can leverage the power of event-based communication to build flexible, scalable, and reliable systems that can respond quickly to changes in our system, while also ensuring compliance with data protection regulations.

## Notes

This stack does cross account and cross region deployments. CICD Pipeline creates KMS key in all regions used in the stack in the same account and then configures the key to allow access from the same account and allow access from the IAM roles in the target accounts. These IAM roles are created by bootstrapping CDK _in_ that account and region. The presence of cdk deployment role is checked immediately by AWS and stack deployment will fail with an error like, `Resource handler returned message: "Policy contains a statement with one or more invalid principals.` if the the target account/region is not bootstrapped.\

To bootstrap an account/region, please run

```terminal
npx cdk bootstrap aws://<target-account>/<target-region> --cloudformation-execution-policies arn:aws:iam::aws:policy/AdministratorAccess  --trust <cicd-account> --profile=<profile-to-access-target-account>
```

## References

[How to use EventBridge as a Cross-Account event backbone][1]

[1]: https://dev.to/eoinsha/how-to-use-eventbridge-as-a-cross-account-event-backbone-5fik
[2]: https://www.youtube.com/watch?v=W3Rh70jG-LM