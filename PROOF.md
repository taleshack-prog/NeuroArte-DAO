# NeuroArte DAO — Whitepaper Registration Proof

**Document:** NeuroArte DAO Whitepaper (Final EN)  
**Version:** Final 2025-10  
**Authors:** Tales Hack, Prof. Alexandre de Souza Fortis  
**Date Registered:** 2025-10-18 20:44:47 UTC  
**Network:** Base Mainnet (Ethereum L2)  

**IPFS CID:** `bafkreidtx5gvwsa2cg2yamv4roaewlretv564qp6osgp7n3e64l5fccvsq`  
**SHA-256:** `73bf4d5b481a11b58032bc8b804b2e249d7bee41fe748cffb764f717d2885594`  
**Transaction Hash:** `0x91799367aafb43bda4479eb5b00e08b26c8ab6a74ab6aa0f0ff9c90d9c710d6b`  
**Block:** `37015470`  
**Verification URL:** https://basescan.org/tx/0x91799367aafb43bda4479eb5b00e08b26c8ab6a74ab6aa0f0ff9c90d9c710d6b

---

## What was recorded on-chain
```json
{
  "type": "neuroarte.whitepaper",
  "version": "Final 2025-10",
  "sha256": "73bf4d5b481a11b58032bc8b804b2e249d7bee41fe748cffb764f717d2885594",
  "ipfs": {"docx": "bafkreidtx5gvwsa2cg2yamv4roaewlretv564qp6osgp7n3e64l5fccvsq"},
  "chain": "Base Mainnet",
  "timestamp": "2025-10-18",
  "authors": ["Tales Hack", "Prof. Alexandre de Souza Fortis"]
}
```

## Verify the document integrity
```bash
# 1) Download the whitepaper from IPFS
wget https://gateway.pinata.cloud/ipfs/bafkreidtx5gvwsa2cg2yamv4roaewlretv564qp6osgp7n3e64l5fccvsq -O NeuroArte_Whitepaper_Final_EN.docx

# 2) Compute SHA-256 locally
shasum -a 256 NeuroArte_Whitepaper_Final_EN.docx

# Expected output
73bf4d5b481a11b58032bc8b804b2e249d7bee41fe748cffb764f717d2885594
```

## Verify the on-chain record
1. Open: https://basescan.org/tx/0x91799367aafb43bda4479eb5b00e08b26c8ab6a74ab6aa0f0ff9c90d9c710d6b  
2. Go to **Input Data** → **View as UTF-8** and confirm the fields above.

## Optional: publish ENS text records (recommended)
```
whitepaper-sha256      = 73bf4d5b481a11b58032bc8b804b2e249d7bee41fe748cffb764f717d2885594
whitepaper-ipfs-docx   = ipfs://bafkreidtx5gvwsa2cg2yamv4roaewlretv564qp6osgp7n3e64l5fccvsq
whitepaper-chainanchor = base:0x91799367aafb43bda4479eb5b00e08b26c8ab6a74ab6aa0f0ff9c90d9c710d6b
```

---

## Reproducibility metadata
- **IPFS Gateway URL:** https://gateway.pinata.cloud/ipfs/bafkreidtx5gvwsa2cg2yamv4roaewlretv564qp6osgp7n3e64l5fccvsq
- **Created:** 2025-10-18 21:05:31 UTC
- **License:** As stated in the whitepaper
- **Maintainer:** NeuroArte DAO
