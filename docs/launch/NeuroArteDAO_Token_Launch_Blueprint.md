# 🧠 NeuroArte DAO — Token Launch Blueprint
**Versão:** v1.0 • **Rede:** Base (Ethereum L2) • **Supply fixo:** 10.000.000 $NEURO  
**Função do token:** Coordenação de governança e impacto científico (não é ativo financeiro).

> **Tese:** Arte financia ciência. O $NEURO é o elo entre a produção artística e o financiamento de pesquisas não alopáticas em neurodiversidade, com transparência on-chain e ciência aberta.

---

## 1) Princípios operacionais
- **Supply fixo** (10M, sem inflação) para clareza e previsibilidade.
- **Transparência radical**: whitepaper/IPFS + hash + tx on-chain.
- **Progressive decentralization**: começar simples (multisig + Snapshot) e evoluir.
- **Padronização**: OpenZeppelin, Gnosis Safe, EAS, IPFS.

---

## 2) Especificações do Token
- **Nome/Símbolo:** NeuroArte Token — `$NEURO`  
- **Padrão:** ERC-20 com `ERC20Permit (EIP-2612)` e `ERC20Votes`  
- **Decimais:** 18  
- **Supply total:** **10.000.000 $NEURO** (mint único no deploy para a **Treasury** multisig)  
- **Rede:** Base L2  
- **Propriedade:** funções administrativas mínimas; minter revogado pós-deploy.

**Contrato (esqueleto):**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract NeuroToken is ERC20, ERC20Permit, ERC20Votes {
    uint256 public constant MAX_SUPPLY = 10_000_000 * 1e18; // 10M

    constructor(address treasury)
        ERC20("NeuroArte Token", "NEURO")
        ERC20Permit("NeuroArte Token")
    {
        _mint(treasury, MAX_SUPPLY);
    }

    // hooks do ERC20Votes
    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal override(ERC20, ERC20Votes) { super._afterTokenTransfer(from, to, amount); }
    function _mint(address to, uint256 amount)
        internal override(ERC20, ERC20Votes) { super._mint(to, amount); }
    function _burn(address account, uint256 amount)
        internal override(ERC20, ERC20Votes) { super._burn(account, amount); }
}
