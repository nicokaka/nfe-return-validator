/**
 * Catálogo Oficial de Produtos, EANs, CESTs, NCMs e Regras Tributárias
 * Fonte: docs/polliana/produtos ean cest base.xlsx (Gerência Fiscal)
 */

export interface ProductTaxProfile {
  ipi: string;
  pis: string;
  cofins: string;
  cbs: number | string;
  ibsEstadual: number | string;
  ibsMunicipal: number | string;
}

export interface CatalogProduct {
  cod: number;
  description: string;
  ncm: string;
  cest: string;
  ean: string;
  section: string;
  category: 'MEDICAMENTO' | 'ALIMENTO' | 'COSMETICO';
  infan: ProductTaxProfile;
  quesalon: ProductTaxProfile;
}

export const PRODUCT_CATALOG: CatalogProduct[] = [
  {
    "cod": 18,
    "description": "FLORAX Pediátrico Suspensão Oral cx. c/5 flaconetes de 5mL",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896685300183",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 19,
    "description": "FLORAX Adulto Suspensão Oral  cx. c/5 flaconetes de 5mL",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896685300190",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 30,
    "description": "BROMELIN Suspensão Oral fr. c/100mL",
    "ncm": "30049019",
    "cest": "13.004.01",
    "ean": "7896685300473",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 32,
    "description": "FLORAX Pediatrico Hospital c/100 flaconetes de 5mL",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896685301296",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 33,
    "description": "FLORAX Adulto Hospital c/100 flaconetes de 5mL",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896685301289",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 55,
    "description": "GAMAX Cápsulas cx. c/15",
    "ncm": "30049029",
    "cest": "13.004.01",
    "ean": "7896685300626",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 114,
    "description": "PROSTOKOS 25mcg Comprimidos Vaginal cx. c/100 (C1)",
    "ncm": "30049029",
    "cest": "13.004.01",
    "ean": "7896685301227",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 116,
    "description": "GAMAX Cápsulas cx. c/30",
    "ncm": "30049029",
    "cest": "13.004.01",
    "ean": "7896685301234",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 129,
    "description": "BOLDINE Cápsulas cx. c/30",
    "ncm": "30045090",
    "cest": "13.004.01",
    "ean": "7896685301920",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 135,
    "description": "PROSTOKOS 200mcg Comprimidos Vaginal cx. c/50 (C1)",
    "ncm": "30043999",
    "cest": "13.004.01",
    "ean": "7896685301388",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 180,
    "description": "KRONEL Gel Ginecológico 60g c/10 apl.",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896685300657",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 406,
    "description": "FLORAX SM Adulto cx. c/5 flaconetes de 5mL",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896685301654",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 408,
    "description": "FLORAX SM Pediátrico cx. c/5 flaconetes de 5mL",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896685301661",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 336,
    "description": "HIZOFITO Cápsulas cx. c/30",
    "ncm": "30045090",
    "cest": "13.004.01",
    "ean": "7896685301678",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 410,
    "description": "FLORAX SM UVA Adulto cx. c/5 flaconetes de 5mL",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896685303290",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 411,
    "description": "FLORAX SM UVA Pediátrico cx. c/5 flaconetes de 5mL",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896685303283",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 424,
    "description": "FLORAX SM ATB Adulto cx. c/10 flaconetes de 5mL",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896685303559",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 425,
    "description": "FLORAX SM ATB Pediátrico cx. c/10 flaconetes de 5mL",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896685303566",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 427,
    "description": "FLORAX HYDRA 45, Sabor GUARANÁ fr. c/500ml",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896685303818",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 428,
    "description": "FLORAX HYDRA 45, Sabor NATURAL fr. c/500ml",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896685303825",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 500,
    "description": "ZICLAGUE Spray 60mL",
    "ncm": "30049019",
    "cest": "13.004.01",
    "ean": "7896685302637",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 510,
    "description": "ZICLAGUE Spray 30mL",
    "ncm": "30049019",
    "cest": "13.004.01",
    "ean": "7896685302620",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 936,
    "description": "KIOS Comprim. Revest. 640mg Cx. c/ 14",
    "ncm": "30049069",
    "cest": "13.004.01",
    "ean": "7896685302002",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 937,
    "description": "KIOS Comprim. Revest. 640mg Cx. c/ 28",
    "ncm": "30049069",
    "cest": "13.004.01",
    "ean": "7896685302026",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 938,
    "description": "KIOS Comprim. Revest. 640mg Cx. c/ 60",
    "ncm": "30049069",
    "cest": "13.004.01",
    "ean": "7896685303320",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.021",
      "cofins": "0.099",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1203,
    "description": "ANSIOFITO",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896677706986",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "Não vende",
      "pis": "Não vende",
      "cofins": "Não vende",
      "cbs": "Não vende",
      "ibsEstadual": "Não vende",
      "ibsMunicipal": "Não vende"
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 223,
    "description": "ENDORUS",
    "ncm": "30049099",
    "cest": "13.004.01",
    "ean": "7896677706856",
    "section": "Linha Humana",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "Não vende",
      "pis": "Não vende",
      "cofins": "Não vende",
      "cbs": "Não vende",
      "ibsEstadual": "Não vende",
      "ibsMunicipal": "Não vende"
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 161,
    "description": "IMUNOGLUCAN DS Cx. c/ 30 cápsulas",
    "ncm": "29362990",
    "cest": "13.006.00",
    "ean": "7896685303467",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 163,
    "description": "IMUNOGLUCAN DS Cx. c/ 60 cápsulas",
    "ncm": "29362990",
    "cest": "13.006.00",
    "ean": "7896685303634",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 167,
    "description": "ENERGICLIN Kids 30 gummies",
    "ncm": "21069030",
    "cest": "NÃO É ST",
    "ean": "7896685303436",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 172,
    "description": "BROMELIN Z Susp. c/100mL OR",
    "ncm": "21069030",
    "cest": "NÃO É ST",
    "ean": "7896685303764",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 182,
    "description": "IMUNOGLUCAN DS - Suspensão Oral - 150mL",
    "ncm": "29362990",
    "cest": "13.006.00",
    "ean": "7896685303450",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 194,
    "description": "FLUENCE SOLUÇÃO GOTAS, FRASCO DE VIDRO C/ 50ML",
    "ncm": "29362911",
    "cest": "13.006.00",
    "ean": "7896685303757",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 195,
    "description": "FLUENCE Suspensão Oral fr. c/150mL",
    "ncm": "29362911",
    "cest": "13.006.00",
    "ean": "7896685303740",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 209,
    "description": "BROMELIN PROPOLIS PASTILHA OR",
    "ncm": "21069060",
    "cest": "NÃO É ST",
    "ean": "7896685304594",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 211,
    "description": "IMUNIZAN CAPSULAS",
    "ncm": "21069030",
    "cest": "NÃO É ST",
    "ean": "7896685304587",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 212,
    "description": "IMUNIZAN SUSPENSÃO",
    "ncm": "21069030",
    "cest": "NÃO É ST",
    "ean": "7896685304648",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 258,
    "description": "IMUNOGLUCAN PRO",
    "ncm": "21069030",
    "cest": "NÃO É ST",
    "ean": "7896685304945",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 340,
    "description": "MEGABRON",
    "ncm": "21069030",
    "cest": "NÃO É ST",
    "ean": "7896685304662",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 341,
    "description": "DONINA CAPSULA POTE C/30 OR",
    "ncm": "21069030",
    "cest": "NÃO É ST",
    "ean": "7896685304655",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 340,
    "description": "MEGABRON",
    "ncm": "21069030",
    "cest": "NÃO É ST",
    "ean": "7896685304662",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 886,
    "description": "QUITLIS Solução Oral fr. c/150mL",
    "ncm": "29369000",
    "cest": "13.006.00",
    "ean": "7896685302095",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 888,
    "description": "ENERGICLIN Comprimidos cx. c/30",
    "ncm": "29362990",
    "cest": "13.006.00",
    "ean": "78966853020-88",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 902,
    "description": "ENERGICLIN C com OR 30",
    "ncm": "29362710",
    "cest": "13.006.00",
    "ean": "7896685304044",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 903,
    "description": "ENERGICLIN C + ZN COMPRIMIMIDOS CX C/30",
    "ncm": "29362937",
    "cest": "13.006.00",
    "ean": "7896685304051",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 904,
    "description": "APPORTE D3 COMPIMIDOS 2.000 UI CX C/30",
    "ncm": "29362921",
    "cest": "13.006.00",
    "ean": "7896685303948",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 905,
    "description": "APPORTE D3 SOL ORAL GOTAS 10 ML",
    "ncm": "29362921",
    "cest": "13.006.00",
    "ean": "7896685304464",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 912,
    "description": "ENERGICLIN Comprimidos cx. c/30",
    "ncm": "29362990",
    "cest": "13.006.00",
    "ean": "7896685302088",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1010,
    "description": "ENERGICLIN POWER DRINK LIMAO",
    "ncm": "22029900",
    "cest": "03.015.00",
    "ean": "7896685304792",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1011,
    "description": "ENERGICLIN POWER DRINK TANGERINA",
    "ncm": "22029900",
    "cest": "03.015.00",
    "ean": "7896685304808",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1014,
    "description": "ENERGICLIN DRINK LIMÃO",
    "ncm": "22029900",
    "cest": "03.015.00",
    "ean": "7896685304723",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1015,
    "description": "ENERGICLIN DRINK TANGERINA",
    "ncm": "22029900",
    "cest": "03.015.00",
    "ean": "7896685304730",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1019,
    "description": "ENERGICLIN DRINK UVA",
    "ncm": "22029900",
    "cest": "03.015.00",
    "ean": "789668530474-7",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1106,
    "description": "BROMELIN S Susp. c/100mL OR",
    "ncm": "21069030",
    "cest": "NÃO É ST",
    "ean": "789668530288-0",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1146,
    "description": "ENERGICLIN CAFF Comprimidos cx. c/30",
    "ncm": "29362990",
    "cest": "13.006.00",
    "ean": "789668530302-3",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1157,
    "description": "NATIBEM, 60 cápsulas gelatinosas moles",
    "ncm": "29369000",
    "cest": "13.006.00",
    "ean": "7896685303016",
    "section": "Linha Humana",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 44,
    "description": "BROMELIN PRÓPOLIS Spray fr. c/50mL",
    "ncm": "33069000",
    "cest": "20.025.00",
    "ean": "7896685300497",
    "section": "Linha Humana",
    "category": "COSMETICO",
    "infan": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 130,
    "description": "KRONEL Sabonete Líquido fr. c/250mL",
    "ncm": "34012010",
    "cest": "20.036.00",
    "ean": "7896685301395",
    "section": "Linha Humana",
    "category": "COSMETICO",
    "infan": {
      "ipi": "0.0325",
      "pis": "0.022",
      "cofins": "0.103",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 197,
    "description": "KRONEL SABONETE LIQUIDO BABY 250mL",
    "ncm": "34012010",
    "cest": "20.036.00",
    "ean": "7896685303856",
    "section": "Linha Humana",
    "category": "COSMETICO",
    "infan": {
      "ipi": "0.0325",
      "pis": "0.022",
      "cofins": "0.103",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 240,
    "description": "KRONEL Sabonete Líquido Infantil fr. c/250mL",
    "ncm": "34012010",
    "cest": "20.036.00",
    "ean": "789668530149-4",
    "section": "Linha Humana",
    "category": "COSMETICO",
    "infan": {
      "ipi": "0.0325",
      "pis": "0.022",
      "cofins": "0.103",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 241,
    "description": "KRONEL WOMAN SAB LIQ OR 80 mL",
    "ncm": "34012010",
    "cest": "20.036.00",
    "ean": "7896685303863",
    "section": "Linha Humana",
    "category": "COSMETICO",
    "infan": {
      "ipi": "0.0325",
      "pis": "0.022",
      "cofins": "0.103",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1055,
    "description": "KRONEL Sabonete Líquido Baby Show da Luna fr. c/250mL",
    "ncm": "34012010",
    "cest": "20.036.00",
    "ean": "7896685303856",
    "section": "Linha Humana",
    "category": "COSMETICO",
    "infan": {
      "ipi": "0.0325",
      "pis": "0.022",
      "cofins": "0.103",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1076,
    "description": "KRONEL Teen Pink Sabonete Íntimo",
    "ncm": "34012010",
    "cest": "20.036.00",
    "ean": "7896685302743",
    "section": "Linha Humana",
    "category": "COSMETICO",
    "infan": {
      "ipi": "0.0325",
      "pis": "0.022",
      "cofins": "0.103",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1077,
    "description": "KRONEL Man Natural Sabonete Líquido Masculino – 250ml",
    "ncm": "34012010",
    "cest": "20.036.00",
    "ean": "7896685302477",
    "section": "Linha Humana",
    "category": "COSMETICO",
    "infan": {
      "ipi": "0.0325",
      "pis": "0.022",
      "cofins": "0.103",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1087,
    "description": "TYMINA EMULGEL FRASCO C/ 30G",
    "ncm": "33049910",
    "cest": "20.014.00",
    "ean": "7896685303870",
    "section": "Linha Humana",
    "category": "COSMETICO",
    "infan": {
      "ipi": "0.143",
      "pis": "0.022",
      "cofins": "0.103",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1228,
    "description": "KRONEL CANDIFREE",
    "ncm": "34013000",
    "cest": "20.037.00",
    "ean": "7896685305041",
    "section": "Linha Humana",
    "category": "COSMETICO",
    "infan": {
      "ipi": "0.065",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 169,
    "description": "DIARRIL OR",
    "ncm": "30024991",
    "cest": "NÃO POSSUI",
    "ean": "7896685304365",
    "section": "Linha Veterinária",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 207,
    "description": "IMUNIZAN PET",
    "ncm": "23099090",
    "cest": "NÃO POSSUI",
    "ean": "7896685304372",
    "section": "Linha Veterinária",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 221,
    "description": "DIARRIL C/20 OR",
    "ncm": "30024991",
    "cest": "NÃO POSSUI",
    "ean": "7896685304884",
    "section": "Linha Veterinária",
    "category": "MEDICAMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 254,
    "description": "BIONATURALIS",
    "ncm": "23099090",
    "cest": "NÃO POSSUI",
    "ean": "78966853048-15",
    "section": "Linha Veterinária",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 259,
    "description": "IMUNIZAN CAT BISNAGA C/30g OR",
    "ncm": "23099090",
    "cest": "NÃO POSSUI",
    "ean": "7897940708195",
    "section": "Linha Veterinária",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 222,
    "description": "DIARRIL HYDRA",
    "ncm": "23099090",
    "cest": "NÃO POSSUI",
    "ean": "7896685304952",
    "section": "Linha Veterinária",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 226,
    "description": "IMUNIZAN PET COMPRIMIDO C/30 OR",
    "ncm": "23099090",
    "cest": "NÃO POSSUI",
    "ean": "789668530505-8",
    "section": "Linha Veterinária",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 927,
    "description": "D3 VET",
    "ncm": "23099090",
    "cest": "NÃO POSSUI",
    "ean": "7896685304969",
    "section": "Linha Veterinária",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1021,
    "description": "OSPORIM 1000",
    "ncm": "23099090",
    "cest": "NÃO POSSUI",
    "ean": "7896685304716",
    "section": "Linha Veterinária",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1024,
    "description": "OSPORIM 500",
    "ncm": "23099090",
    "cest": "NÃO POSSUI",
    "ean": "7896685304679",
    "section": "Linha Veterinária",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1025,
    "description": "OG3 500",
    "ncm": "23099090",
    "cest": "NÃO POSSUI",
    "ean": "7896685304679",
    "section": "Linha Veterinária",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1022,
    "description": "OG3 1.000",
    "ncm": "23099090",
    "cest": "NÃO POSSUI",
    "ean": "7896685304686",
    "section": "Linha Veterinária",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1023,
    "description": "OSPOGENASE",
    "ncm": "23099090",
    "cest": "NÃO POSSUI",
    "ean": "7896685304846",
    "section": "Linha Veterinária",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 225,
    "description": "RIMPAX BISNAGA C/30g OR",
    "ncm": "23099090",
    "cest": "NÃO POSSUI",
    "ean": "7897940708690",
    "section": "Linha Veterinária",
    "category": "ALIMENTO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 210,
    "description": "PROPLAC VET SPRAY OR",
    "ncm": "33069000",
    "cest": "20.025.00",
    "ean": "7896685303979",
    "section": "Linha Veterinária",
    "category": "COSMETICO",
    "infan": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1089,
    "description": "ARBA VET OR 250 ML",
    "ncm": "34011900",
    "cest": "20.035.00",
    "ean": "7896685303986",
    "section": "Linha Veterinária",
    "category": "COSMETICO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1090,
    "description": "ARBA VET OR 500 ML",
    "ncm": "34011900",
    "cest": "20.035.00",
    "ean": "7896685303993",
    "section": "Linha Veterinária",
    "category": "COSMETICO",
    "infan": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "0.0165",
      "cofins": "0.076",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1101,
    "description": "MILETO OR 200ML",
    "ncm": "33079000",
    "cest": "20.032.00",
    "ean": "7896685304389",
    "section": "Linha Veterinária",
    "category": "COSMETICO",
    "infan": {
      "ipi": "0.143",
      "pis": "0.022",
      "cofins": "0.103",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  },
  {
    "cod": 1105,
    "description": "MILETO OR 5L",
    "ncm": "33079000",
    "cest": "20.032.00",
    "ean": "7896685304631",
    "section": "Linha Veterinária",
    "category": "COSMETICO",
    "infan": {
      "ipi": "0.143",
      "pis": "0.022",
      "cofins": "0.103",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    },
    "quesalon": {
      "ipi": "NÃO",
      "pis": "NÃO",
      "cofins": "NÃO",
      "cbs": 0.009,
      "ibsEstadual": 0.001,
      "ibsMunicipal": 0.0
    }
  }
];

const EAN_MAP = new Map<string, CatalogProduct>();
const COD_MAP = new Map<number, CatalogProduct>();

for (const p of PRODUCT_CATALOG) {
  if (p.ean && p.ean !== 'SEM GTIN' && p.ean !== '0') {
    EAN_MAP.set(p.ean.trim(), p);
  }
  COD_MAP.set(p.cod, p);
}

export function findProductByEan(ean: string): CatalogProduct | undefined {
  if (!ean) return undefined;
  const clean = ean.trim();
  return EAN_MAP.get(clean);
}

export function findProductByCode(code: number | string): CatalogProduct | undefined {
  const num = typeof code === 'string' ? parseInt(code.replace(/\D/g, ''), 10) : code;
  if (isNaN(num)) return undefined;
  return COD_MAP.get(num);
}
