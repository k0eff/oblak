'use strict';

const SagaService = require('./SagaService');

class Saga {
	constructor({
		name = 'saga',
		internalGroup = '',
	} = {}) {
		this.name = name;
		this.internalGroup = internalGroup;
	}

	processes({ sagas }) { // eslint-disable-line
		const services = [];
		Object.entries(sagas).forEach(([type, { sagas: subSagas }]) => Object.keys(subSagas).forEach((sagaName) => {
			if (
				(Array.isArray(this.internalGroup) && this.internalGroup.includes(type))
				|| (typeof this.internalGroup === 'string' && !!this.internalGroup)
			)
				services.push(new SagaService({ type, sagaName }));
		}));
		if (services.length < 1) throw new Error('Cannot init sagas: No groups can be selected.');
		return services.filter(Boolean);
		// return Object.keys(sagas).map(sagaName => new SagaService({ sagaName, name: `${this.name}:${sagaName}` })).filter(a => a);
	}
}

module.exports = Saga;
