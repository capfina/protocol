const util = require('util');
const inquirer = require('inquirer');

const validateProposal = require('./validate_proposal');

// Method signatures
const SIGNATURES = {
  // ProxyAdmin::upgrade(AdminUpgradeabilityProxy proxy, address implementation)
  upgrade: 'upgrade(address,address)',
  // ProxyAdmin::upgradeAndCall(AdminUpgradeabilityProxy proxy, address implementation, bytes memory data)
  upgradeAndCall: 'upgradeAndCall(address,address,bytes)'
};

/*
Proposal class
*/

class Proposal {

  constructor(data, opts) {
    this.data = data;
    this.opts = opts || {};
    this.web3 = this.opts.web3;
    this.artifacts = this.opts.artifacts;
    this.proxyAdminAddress = this.opts.proxyAdminAddress;
    this.governanceAddress = this.opts.governanceAddress;
  }

  async validate() {
    try {
      await validateProposal(this.data);
    } catch (e) {
      console.error(e.errors);
      throw e;
    }
  }

  async prepareToSubmit() {

    // Validate proposal
    await this.validate();

    const {
      title,
      description,
      discoverabilityPeriod,
      expedited,
      transactions
    } = this.data;

    const state = {
      contracts: [],
      values: [],
      signatures: [],
      calldatas: []
    };

    const formatParamValue = (param) => {
      const { type, value } = param;
      if (type.startsWith('uint') && type.endsWith('[]')) return value.map(item => formatParamValue({type: type.slice(0, -2), value: item}));
      if (type.startsWith('uint')) return BigInt(value).toString();
      return value;
    }

    const encodeFunctionCall = (name, params) => {
      return this.web3.eth.abi.encodeFunctionCall({
        type: 'function',
        name,
        inputs: params.map(param => ({name: param.name, type: param.type}))
      }, params.map(formatParamValue));
    }

    // Go through submitted transactions
    for (let transaction of transactions) {

      const { type } = transaction;

      if (type === 'upgrade') {

        const {
          contract,
          new_implementation,
          initialize,
          value
        } = transaction;

        const { method, params } = initialize || {};

        // Call the ProxyAdmin upgrade/upgradeAndCall methods with the current proxy address and the new implementation
        state.contracts.push(this.proxyAdminAddress);
        state.values.push(BigInt(value || '0').toString());

        if (initialize) {
          state.signatures.push(SIGNATURES.upgradeAndCall);

          // If there's an initialize method to call after upgrade, add it as bytes parameter in the ProxyAdmin call
          const bytes = encodeFunctionCall(method, params);
          state.calldatas.push(
            this.web3.eth.abi.encodeParameters(
              ['address', 'address', 'bytes'],
              [contract, new_implementation, bytes]
            )
          );
        } else {
          state.signatures.push(SIGNATURES.upgrade);
          state.calldatas.push(
            this.web3.eth.abi.encodeParameters(
              ['address', 'address'],
              [contract, new_implementation]
            )
          );
        }

      } else {

        // Calling a method on a contract

        const {
          contract,
          method,
          params,
          value
        } = transaction;

        state.contracts.push(contract);
        state.values.push(BigInt(value || '0').toString());
        state.signatures.push(`${method}(${params.map(param => param.type).join(',')})`);
        state.calldatas.push(
          this.web3.eth.abi.encodeParameters(params.map(param => param.type), params.map(formatParamValue))
        );
      
      }

    }

    return [
      BigInt(discoverabilityPeriod).toString(), 
      state.contracts, 
      state.values, 
      state.signatures, 
      state.calldatas, 
      `${title} - ${description}`,
      expedited || false
    ];

  }

  async submit(params) {

    const {
      from,
      gas,
      gasPrice,
      dryRun
    } = (params || {});

    const proposalData = await this.prepareToSubmit();
    console.log(util.inspect(proposalData, false, null, true));

      const { confirm_submit } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm_submit',
          message: 'submit proposal',
          default: false
        }
      ]);

    if (confirm_submit) {
      const Governance = await this.artifacts.readArtifact('Governance');
      const governance = new this.web3.eth.Contract(Governance.abi, this.governanceAddress);
      return governance.methods.submitProposal(...proposalData).send({
        from,
        gas: gas || 300000,
        gasPrice: gasPrice || 100e9
      });
    }

  }

}

module.exports = Proposal;