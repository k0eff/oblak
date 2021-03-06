'use strict';

const Base = require('../shared/Base');

const DomainStream = require('./DomainStream');

const flattenDomain = (domain, { internalGroup }) => Object.entries(domain).reduce((arr, [context, aggregates]) => {
	let commands;
	if (internalGroup.includes(context)) {
		commands = Object.keys(aggregates).map(aggregate => `command.${context}.${aggregate}`);
		arr.push(commands);
	}
	return arr;
}, []);

const DEFAULT_SERVICE_NAME = 'domain';

class Domain extends Base {
	constructor({
		name = DEFAULT_SERVICE_NAME,
		description = 'Oblak Domain Services',
		internalGroup = '',
	} = {}) {
		super(name, description);
		this.internalGroup = internalGroup;
	}

	linkService(app, oblak) {
		const domainFlattened = flattenDomain(oblak.domain, { internalGroup: this.internalGroup });

		// Setup IoPorts
		this.app.commandbus.in(new this.app.wires.commandbus.amqp.Receiver(domainFlattened));
		this.app.eventbus.out(new this.app.wires.eventbus.amqp.Sender());

		this.domainStream = new DomainStream(app, oblak);

		// setup the connection
		this.app.commandbus.incoming.pipe(this.domainStream).pipe(this.app.eventbus.outgoing);

		return this;
	}

	async init(oblak) {
		await super.init(oblak);
		await this.domainStream.init(oblak, this);
	}

	sendCommand(cmd) {
		return new Promise((ack, reject) => {
			cmd.reject = reject;
			cmd.ack = ack;
			this.domainStream.write(cmd);
		});
	}

	// use with exteme care
	async clear(oblak) {
		const log = this.app.services.getLogger();
		log.info('Clearing Eventstore...');

		await this.domainStream.init(oblak, this);
		await this.domainStream.clear();
		await this.app.commandbus.clear();
		await this.app.eventbus.clear();

		log.info('Eventstore cleared...');
	}

	shouldRun({ domain }) { // eslint-disable-line
		return domain;
	}
}

module.exports = Domain;
