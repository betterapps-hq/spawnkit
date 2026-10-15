// Public platform catalog, refreshed 2026-10-13. Prices are customer estimates in USD/hour.
// Provider mapping is internal. Catalog locations do not guarantee deployment capacity.
export const hostingRegions = [
  {
    id: "nl-amsterdam",
    city: "Amsterdam",
    country: "NL",
    continent: "Europe"
  },
  {
    id: "us-atlanta",
    city: "Atlanta",
    country: "US",
    continent: "North America"
  },
  {
    id: "in-bangalore",
    city: "Bangalore",
    country: "IN",
    continent: "Asia"
  },
  {
    id: "us-chicago",
    city: "Chicago",
    country: "US",
    continent: "North America"
  },
  {
    id: "us-dallas",
    city: "Dallas",
    country: "US",
    continent: "North America"
  },
  {
    id: "in-delhi-ncr",
    city: "Delhi NCR",
    country: "IN",
    continent: "Asia"
  },
  {
    id: "de-frankfurt",
    city: "Frankfurt",
    country: "DE",
    continent: "Europe"
  },
  {
    id: "us-honolulu",
    city: "Honolulu",
    country: "US",
    continent: "North America"
  },
  {
    id: "za-johannesburg",
    city: "Johannesburg",
    country: "ZA",
    continent: "Africa"
  },
  {
    id: "gb-london",
    city: "London",
    country: "GB",
    continent: "Europe"
  },
  {
    id: "us-los-angeles",
    city: "Los Angeles",
    country: "US",
    continent: "North America"
  },
  {
    id: "es-madrid",
    city: "Madrid",
    country: "ES",
    continent: "Europe"
  },
  {
    id: "gb-manchester",
    city: "Manchester",
    country: "GB",
    continent: "Europe"
  },
  {
    id: "au-melbourne",
    city: "Melbourne",
    country: "AU",
    continent: "Australia"
  },
  {
    id: "mx-mexico-city",
    city: "Mexico City",
    country: "MX",
    continent: "North America"
  },
  {
    id: "us-miami",
    city: "Miami",
    country: "US",
    continent: "North America"
  },
  {
    id: "it-milan",
    city: "Milan",
    country: "IT",
    continent: "Europe"
  },
  {
    id: "in-mumbai",
    city: "Mumbai",
    country: "IN",
    continent: "Asia"
  },
  {
    id: "us-new-jersey",
    city: "New Jersey",
    country: "US",
    continent: "North America"
  },
  {
    id: "jp-osaka",
    city: "Osaka",
    country: "JP",
    continent: "Asia"
  },
  {
    id: "fr-paris",
    city: "Paris",
    country: "FR",
    continent: "Europe"
  },
  {
    id: "cl-santiago",
    city: "Santiago",
    country: "CL",
    continent: "South America"
  },
  {
    id: "br-s-o-paulo",
    city: "São Paulo",
    country: "BR",
    continent: "South America"
  },
  {
    id: "us-seattle",
    city: "Seattle",
    country: "US",
    continent: "North America"
  },
  {
    id: "kr-seoul",
    city: "Seoul",
    country: "KR",
    continent: "Asia"
  },
  {
    id: "us-silicon-valley",
    city: "Silicon Valley",
    country: "US",
    continent: "North America"
  },
  {
    id: "sg-singapore",
    city: "Singapore",
    country: "SG",
    continent: "Asia"
  },
  {
    id: "se-stockholm",
    city: "Stockholm",
    country: "SE",
    continent: "Europe"
  },
  {
    id: "au-sydney",
    city: "Sydney",
    country: "AU",
    continent: "Australia"
  },
  {
    id: "il-tel-aviv",
    city: "Tel Aviv",
    country: "IL",
    continent: "Asia"
  },
  {
    id: "jp-tokyo",
    city: "Tokyo",
    country: "JP",
    continent: "Asia"
  },
  {
    id: "ca-toronto",
    city: "Toronto",
    country: "CA",
    continent: "North America"
  },
  {
    id: "pl-warsaw",
    city: "Warsaw",
    country: "PL",
    continent: "Europe"
  }
]
export interface HostingPlan {
  id: string
  system: string
  cores: number
  ramGb: number
  regions: string[]
  rates: Record<string, { production: number; sandbox: number }>
}
export const hostingPlans: HostingPlan[] = [
  {
    id: "standard-1c-2gb",
    system: "standard",
    cores: 1,
    ramGb: 2,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.028,
        sandbox: 0.021
      },
      "us-chicago": {
        production: 0.028,
        sandbox: 0.021
      },
      "us-dallas": {
        production: 0.028,
        sandbox: 0.021
      },
      "us-seattle": {
        production: 0.028,
        sandbox: 0.021
      },
      "us-los-angeles": {
        production: 0.028,
        sandbox: 0.021
      },
      "us-atlanta": {
        production: 0.028,
        sandbox: 0.021
      },
      "nl-amsterdam": {
        production: 0.028,
        sandbox: 0.021
      },
      "gb-london": {
        production: 0.028,
        sandbox: 0.021
      },
      "de-frankfurt": {
        production: 0.028,
        sandbox: 0.021
      },
      "us-silicon-valley": {
        production: 0.028,
        sandbox: 0.021
      },
      "au-sydney": {
        production: 0.028,
        sandbox: 0.021
      },
      "ca-toronto": {
        production: 0.028,
        sandbox: 0.021
      },
      "fr-paris": {
        production: 0.028,
        sandbox: 0.021
      },
      "jp-tokyo": {
        production: 0.028,
        sandbox: 0.021
      },
      "pl-warsaw": {
        production: 0.028,
        sandbox: 0.021
      },
      "es-madrid": {
        production: 0.028,
        sandbox: 0.021
      },
      "kr-seoul": {
        production: 0.028,
        sandbox: 0.021
      },
      "us-miami": {
        production: 0.028,
        sandbox: 0.021
      },
      "sg-singapore": {
        production: 0.028,
        sandbox: 0.021
      },
      "se-stockholm": {
        production: 0.028,
        sandbox: 0.021
      },
      "mx-mexico-city": {
        production: 0.028,
        sandbox: 0.021
      },
      "br-s-o-paulo": {
        production: 0.042,
        sandbox: 0.0315
      },
      "au-melbourne": {
        production: 0.028,
        sandbox: 0.021
      },
      "in-mumbai": {
        production: 0.028,
        sandbox: 0.021
      },
      "za-johannesburg": {
        production: 0.028,
        sandbox: 0.021
      },
      "il-tel-aviv": {
        production: 0.028,
        sandbox: 0.021
      },
      "in-bangalore": {
        production: 0.028,
        sandbox: 0.021
      },
      "in-delhi-ncr": {
        production: 0.028,
        sandbox: 0.021
      },
      "cl-santiago": {
        production: 0.028,
        sandbox: 0.021
      },
      "jp-osaka": {
        production: 0.028,
        sandbox: 0.021
      },
      "gb-manchester": {
        production: 0.028,
        sandbox: 0.021
      }
    }
  },
  {
    id: "standard-2c-2gb",
    system: "standard",
    cores: 2,
    ramGb: 2,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.042,
        sandbox: 0.0315
      },
      "us-chicago": {
        production: 0.042,
        sandbox: 0.0315
      },
      "us-dallas": {
        production: 0.042,
        sandbox: 0.0315
      },
      "us-seattle": {
        production: 0.042,
        sandbox: 0.0315
      },
      "us-los-angeles": {
        production: 0.042,
        sandbox: 0.0315
      },
      "us-atlanta": {
        production: 0.042,
        sandbox: 0.0315
      },
      "nl-amsterdam": {
        production: 0.042,
        sandbox: 0.0315
      },
      "gb-london": {
        production: 0.042,
        sandbox: 0.0315
      },
      "de-frankfurt": {
        production: 0.042,
        sandbox: 0.0315
      },
      "us-silicon-valley": {
        production: 0.042,
        sandbox: 0.0315
      },
      "au-sydney": {
        production: 0.042,
        sandbox: 0.0315
      },
      "ca-toronto": {
        production: 0.042,
        sandbox: 0.0315
      },
      "fr-paris": {
        production: 0.042,
        sandbox: 0.0315
      },
      "jp-tokyo": {
        production: 0.042,
        sandbox: 0.0315
      },
      "pl-warsaw": {
        production: 0.042,
        sandbox: 0.0315
      },
      "es-madrid": {
        production: 0.042,
        sandbox: 0.0315
      },
      "kr-seoul": {
        production: 0.042,
        sandbox: 0.0315
      },
      "us-miami": {
        production: 0.042,
        sandbox: 0.0315
      },
      "sg-singapore": {
        production: 0.042,
        sandbox: 0.0315
      },
      "se-stockholm": {
        production: 0.042,
        sandbox: 0.0315
      },
      "mx-mexico-city": {
        production: 0.042,
        sandbox: 0.0315
      },
      "br-s-o-paulo": {
        production: 0.062,
        sandbox: 0.0465
      },
      "au-melbourne": {
        production: 0.042,
        sandbox: 0.0315
      },
      "in-mumbai": {
        production: 0.042,
        sandbox: 0.0315
      },
      "za-johannesburg": {
        production: 0.042,
        sandbox: 0.0315
      },
      "il-tel-aviv": {
        production: 0.042,
        sandbox: 0.0315
      },
      "in-bangalore": {
        production: 0.042,
        sandbox: 0.0315
      },
      "cl-santiago": {
        production: 0.042,
        sandbox: 0.0315
      },
      "jp-osaka": {
        production: 0.042,
        sandbox: 0.0315
      },
      "gb-manchester": {
        production: 0.042,
        sandbox: 0.0315
      }
    }
  },
  {
    id: "standard-2c-4gb",
    system: "standard",
    cores: 2,
    ramGb: 4,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.054,
        sandbox: 0.0405
      },
      "us-chicago": {
        production: 0.054,
        sandbox: 0.0405
      },
      "us-dallas": {
        production: 0.054,
        sandbox: 0.0405
      },
      "us-seattle": {
        production: 0.054,
        sandbox: 0.0405
      },
      "us-los-angeles": {
        production: 0.054,
        sandbox: 0.0405
      },
      "us-atlanta": {
        production: 0.054,
        sandbox: 0.0405
      },
      "nl-amsterdam": {
        production: 0.054,
        sandbox: 0.0405
      },
      "gb-london": {
        production: 0.054,
        sandbox: 0.0405
      },
      "de-frankfurt": {
        production: 0.054,
        sandbox: 0.0405
      },
      "us-silicon-valley": {
        production: 0.054,
        sandbox: 0.0405
      },
      "au-sydney": {
        production: 0.054,
        sandbox: 0.0405
      },
      "ca-toronto": {
        production: 0.054,
        sandbox: 0.0405
      },
      "fr-paris": {
        production: 0.054,
        sandbox: 0.0405
      },
      "jp-tokyo": {
        production: 0.054,
        sandbox: 0.0405
      },
      "pl-warsaw": {
        production: 0.054,
        sandbox: 0.0405
      },
      "es-madrid": {
        production: 0.054,
        sandbox: 0.0405
      },
      "kr-seoul": {
        production: 0.054,
        sandbox: 0.0405
      },
      "us-miami": {
        production: 0.054,
        sandbox: 0.0405
      },
      "sg-singapore": {
        production: 0.054,
        sandbox: 0.0405
      },
      "se-stockholm": {
        production: 0.054,
        sandbox: 0.0405
      },
      "mx-mexico-city": {
        production: 0.054,
        sandbox: 0.0405
      },
      "br-s-o-paulo": {
        production: 0.082,
        sandbox: 0.0615
      },
      "au-melbourne": {
        production: 0.054,
        sandbox: 0.0405
      },
      "in-mumbai": {
        production: 0.054,
        sandbox: 0.0405
      },
      "za-johannesburg": {
        production: 0.054,
        sandbox: 0.0405
      },
      "il-tel-aviv": {
        production: 0.054,
        sandbox: 0.0405
      },
      "in-bangalore": {
        production: 0.054,
        sandbox: 0.0405
      },
      "in-delhi-ncr": {
        production: 0.054,
        sandbox: 0.0405
      },
      "cl-santiago": {
        production: 0.054,
        sandbox: 0.0405
      },
      "jp-osaka": {
        production: 0.054,
        sandbox: 0.0405
      },
      "gb-manchester": {
        production: 0.054,
        sandbox: 0.0405
      }
    }
  },
  {
    id: "standard-4c-8gb",
    system: "standard",
    cores: 4,
    ramGb: 8,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.11,
        sandbox: 0.0825
      },
      "us-chicago": {
        production: 0.11,
        sandbox: 0.0825
      },
      "us-dallas": {
        production: 0.11,
        sandbox: 0.0825
      },
      "us-seattle": {
        production: 0.11,
        sandbox: 0.0825
      },
      "us-los-angeles": {
        production: 0.11,
        sandbox: 0.0825
      },
      "us-atlanta": {
        production: 0.11,
        sandbox: 0.0825
      },
      "nl-amsterdam": {
        production: 0.11,
        sandbox: 0.0825
      },
      "gb-london": {
        production: 0.11,
        sandbox: 0.0825
      },
      "de-frankfurt": {
        production: 0.11,
        sandbox: 0.0825
      },
      "us-silicon-valley": {
        production: 0.11,
        sandbox: 0.0825
      },
      "au-sydney": {
        production: 0.11,
        sandbox: 0.0825
      },
      "ca-toronto": {
        production: 0.11,
        sandbox: 0.0825
      },
      "fr-paris": {
        production: 0.11,
        sandbox: 0.0825
      },
      "jp-tokyo": {
        production: 0.11,
        sandbox: 0.0825
      },
      "pl-warsaw": {
        production: 0.11,
        sandbox: 0.0825
      },
      "es-madrid": {
        production: 0.11,
        sandbox: 0.0825
      },
      "kr-seoul": {
        production: 0.11,
        sandbox: 0.0825
      },
      "us-miami": {
        production: 0.11,
        sandbox: 0.0825
      },
      "sg-singapore": {
        production: 0.11,
        sandbox: 0.0825
      },
      "se-stockholm": {
        production: 0.11,
        sandbox: 0.0825
      },
      "mx-mexico-city": {
        production: 0.11,
        sandbox: 0.0825
      },
      "br-s-o-paulo": {
        production: 0.164,
        sandbox: 0.123
      },
      "au-melbourne": {
        production: 0.11,
        sandbox: 0.0825
      },
      "in-mumbai": {
        production: 0.11,
        sandbox: 0.0825
      },
      "za-johannesburg": {
        production: 0.11,
        sandbox: 0.0825
      },
      "il-tel-aviv": {
        production: 0.11,
        sandbox: 0.0825
      },
      "in-bangalore": {
        production: 0.11,
        sandbox: 0.0825
      },
      "cl-santiago": {
        production: 0.11,
        sandbox: 0.0825
      },
      "jp-osaka": {
        production: 0.11,
        sandbox: 0.0825
      },
      "gb-manchester": {
        production: 0.11,
        sandbox: 0.0825
      }
    }
  },
  {
    id: "standard-6c-16gb",
    system: "standard",
    cores: 6,
    ramGb: 16,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.22,
        sandbox: 0.165
      },
      "us-chicago": {
        production: 0.22,
        sandbox: 0.165
      },
      "us-dallas": {
        production: 0.22,
        sandbox: 0.165
      },
      "us-seattle": {
        production: 0.22,
        sandbox: 0.165
      },
      "us-los-angeles": {
        production: 0.22,
        sandbox: 0.165
      },
      "us-atlanta": {
        production: 0.22,
        sandbox: 0.165
      },
      "nl-amsterdam": {
        production: 0.22,
        sandbox: 0.165
      },
      "gb-london": {
        production: 0.22,
        sandbox: 0.165
      },
      "de-frankfurt": {
        production: 0.22,
        sandbox: 0.165
      },
      "us-silicon-valley": {
        production: 0.22,
        sandbox: 0.165
      },
      "au-sydney": {
        production: 0.22,
        sandbox: 0.165
      },
      "ca-toronto": {
        production: 0.22,
        sandbox: 0.165
      },
      "fr-paris": {
        production: 0.22,
        sandbox: 0.165
      },
      "jp-tokyo": {
        production: 0.22,
        sandbox: 0.165
      },
      "pl-warsaw": {
        production: 0.22,
        sandbox: 0.165
      },
      "es-madrid": {
        production: 0.22,
        sandbox: 0.165
      },
      "kr-seoul": {
        production: 0.22,
        sandbox: 0.165
      },
      "us-miami": {
        production: 0.22,
        sandbox: 0.165
      },
      "sg-singapore": {
        production: 0.22,
        sandbox: 0.165
      },
      "se-stockholm": {
        production: 0.22,
        sandbox: 0.165
      },
      "mx-mexico-city": {
        production: 0.22,
        sandbox: 0.165
      },
      "br-s-o-paulo": {
        production: 0.328,
        sandbox: 0.246
      },
      "au-melbourne": {
        production: 0.22,
        sandbox: 0.165
      },
      "in-mumbai": {
        production: 0.22,
        sandbox: 0.165
      },
      "za-johannesburg": {
        production: 0.22,
        sandbox: 0.165
      },
      "il-tel-aviv": {
        production: 0.22,
        sandbox: 0.165
      },
      "in-bangalore": {
        production: 0.22,
        sandbox: 0.165
      },
      "cl-santiago": {
        production: 0.22,
        sandbox: 0.165
      },
      "jp-osaka": {
        production: 0.22,
        sandbox: 0.165
      },
      "gb-manchester": {
        production: 0.22,
        sandbox: 0.165
      }
    }
  },
  {
    id: "standard-8c-32gb",
    system: "standard",
    cores: 8,
    ramGb: 32,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.438,
        sandbox: 0.3285
      },
      "us-chicago": {
        production: 0.438,
        sandbox: 0.3285
      },
      "us-dallas": {
        production: 0.438,
        sandbox: 0.3285
      },
      "us-seattle": {
        production: 0.438,
        sandbox: 0.3285
      },
      "us-los-angeles": {
        production: 0.438,
        sandbox: 0.3285
      },
      "us-atlanta": {
        production: 0.438,
        sandbox: 0.3285
      },
      "nl-amsterdam": {
        production: 0.438,
        sandbox: 0.3285
      },
      "gb-london": {
        production: 0.438,
        sandbox: 0.3285
      },
      "de-frankfurt": {
        production: 0.438,
        sandbox: 0.3285
      },
      "us-silicon-valley": {
        production: 0.438,
        sandbox: 0.3285
      },
      "au-sydney": {
        production: 0.438,
        sandbox: 0.3285
      },
      "ca-toronto": {
        production: 0.438,
        sandbox: 0.3285
      },
      "fr-paris": {
        production: 0.438,
        sandbox: 0.3285
      },
      "jp-tokyo": {
        production: 0.438,
        sandbox: 0.3285
      },
      "pl-warsaw": {
        production: 0.438,
        sandbox: 0.3285
      },
      "es-madrid": {
        production: 0.438,
        sandbox: 0.3285
      },
      "kr-seoul": {
        production: 0.438,
        sandbox: 0.3285
      },
      "us-miami": {
        production: 0.438,
        sandbox: 0.3285
      },
      "sg-singapore": {
        production: 0.438,
        sandbox: 0.3285
      },
      "se-stockholm": {
        production: 0.438,
        sandbox: 0.3285
      },
      "mx-mexico-city": {
        production: 0.438,
        sandbox: 0.3285
      },
      "br-s-o-paulo": {
        production: 0.658,
        sandbox: 0.4935
      },
      "au-melbourne": {
        production: 0.438,
        sandbox: 0.3285
      },
      "in-mumbai": {
        production: 0.438,
        sandbox: 0.3285
      },
      "za-johannesburg": {
        production: 0.438,
        sandbox: 0.3285
      },
      "il-tel-aviv": {
        production: 0.438,
        sandbox: 0.3285
      },
      "in-bangalore": {
        production: 0.438,
        sandbox: 0.3285
      },
      "cl-santiago": {
        production: 0.438,
        sandbox: 0.3285
      },
      "jp-osaka": {
        production: 0.438,
        sandbox: 0.3285
      },
      "gb-manchester": {
        production: 0.438,
        sandbox: 0.3285
      }
    }
  },
  {
    id: "standard-16c-64gb",
    system: "standard",
    cores: 16,
    ramGb: 64,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.876,
        sandbox: 0.657
      },
      "us-chicago": {
        production: 0.876,
        sandbox: 0.657
      },
      "us-dallas": {
        production: 0.876,
        sandbox: 0.657
      },
      "us-seattle": {
        production: 0.876,
        sandbox: 0.657
      },
      "us-los-angeles": {
        production: 0.876,
        sandbox: 0.657
      },
      "us-atlanta": {
        production: 0.876,
        sandbox: 0.657
      },
      "nl-amsterdam": {
        production: 0.876,
        sandbox: 0.657
      },
      "gb-london": {
        production: 0.876,
        sandbox: 0.657
      },
      "de-frankfurt": {
        production: 0.876,
        sandbox: 0.657
      },
      "us-silicon-valley": {
        production: 0.876,
        sandbox: 0.657
      },
      "au-sydney": {
        production: 0.876,
        sandbox: 0.657
      },
      "ca-toronto": {
        production: 0.876,
        sandbox: 0.657
      },
      "fr-paris": {
        production: 0.876,
        sandbox: 0.657
      },
      "jp-tokyo": {
        production: 0.876,
        sandbox: 0.657
      },
      "pl-warsaw": {
        production: 0.876,
        sandbox: 0.657
      },
      "es-madrid": {
        production: 0.876,
        sandbox: 0.657
      },
      "kr-seoul": {
        production: 0.876,
        sandbox: 0.657
      },
      "us-miami": {
        production: 0.876,
        sandbox: 0.657
      },
      "sg-singapore": {
        production: 0.876,
        sandbox: 0.657
      },
      "se-stockholm": {
        production: 0.876,
        sandbox: 0.657
      },
      "mx-mexico-city": {
        production: 0.876,
        sandbox: 0.657
      },
      "br-s-o-paulo": {
        production: 1.316,
        sandbox: 0.987
      },
      "au-melbourne": {
        production: 0.876,
        sandbox: 0.657
      },
      "in-mumbai": {
        production: 0.876,
        sandbox: 0.657
      },
      "za-johannesburg": {
        production: 0.876,
        sandbox: 0.657
      },
      "il-tel-aviv": {
        production: 0.876,
        sandbox: 0.657
      },
      "in-bangalore": {
        production: 0.876,
        sandbox: 0.657
      },
      "cl-santiago": {
        production: 0.876,
        sandbox: 0.657
      },
      "jp-osaka": {
        production: 0.876,
        sandbox: 0.657
      },
      "gb-manchester": {
        production: 0.876,
        sandbox: 0.657
      }
    }
  },
  {
    id: "standard-24c-96gb",
    system: "standard",
    cores: 24,
    ramGb: 96,
    regions: [
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-chicago": {
        production: 1.754,
        sandbox: 1.3155
      },
      "us-dallas": {
        production: 1.754,
        sandbox: 1.3155
      },
      "us-seattle": {
        production: 1.754,
        sandbox: 1.3155
      },
      "us-los-angeles": {
        production: 1.754,
        sandbox: 1.3155
      },
      "us-atlanta": {
        production: 1.754,
        sandbox: 1.3155
      },
      "nl-amsterdam": {
        production: 1.754,
        sandbox: 1.3155
      },
      "gb-london": {
        production: 1.754,
        sandbox: 1.3155
      },
      "us-silicon-valley": {
        production: 1.754,
        sandbox: 1.3155
      },
      "au-sydney": {
        production: 1.754,
        sandbox: 1.3155
      },
      "ca-toronto": {
        production: 1.754,
        sandbox: 1.3155
      },
      "fr-paris": {
        production: 1.754,
        sandbox: 1.3155
      },
      "jp-tokyo": {
        production: 1.754,
        sandbox: 1.3155
      },
      "pl-warsaw": {
        production: 1.754,
        sandbox: 1.3155
      },
      "es-madrid": {
        production: 1.754,
        sandbox: 1.3155
      },
      "kr-seoul": {
        production: 1.754,
        sandbox: 1.3155
      },
      "sg-singapore": {
        production: 1.754,
        sandbox: 1.3155
      },
      "se-stockholm": {
        production: 1.754,
        sandbox: 1.3155
      },
      "mx-mexico-city": {
        production: 1.754,
        sandbox: 1.3155
      },
      "au-melbourne": {
        production: 1.754,
        sandbox: 1.3155
      },
      "in-mumbai": {
        production: 1.754,
        sandbox: 1.3155
      },
      "za-johannesburg": {
        production: 1.754,
        sandbox: 1.3155
      },
      "il-tel-aviv": {
        production: 1.754,
        sandbox: 1.3155
      },
      "in-bangalore": {
        production: 1.754,
        sandbox: 1.3155
      },
      "cl-santiago": {
        production: 1.754,
        sandbox: 1.3155
      },
      "jp-osaka": {
        production: 1.754,
        sandbox: 1.3155
      },
      "gb-manchester": {
        production: 1.754,
        sandbox: 1.3155
      }
    }
  },
  {
    id: "high-frequency-1c-2gb",
    system: "high-frequency",
    cores: 1,
    ramGb: 2,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-chicago": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-dallas": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-seattle": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-los-angeles": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-atlanta": {
        production: 0.032,
        sandbox: 0.024
      },
      "nl-amsterdam": {
        production: 0.032,
        sandbox: 0.024
      },
      "gb-london": {
        production: 0.032,
        sandbox: 0.024
      },
      "de-frankfurt": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-silicon-valley": {
        production: 0.032,
        sandbox: 0.024
      },
      "au-sydney": {
        production: 0.032,
        sandbox: 0.024
      },
      "ca-toronto": {
        production: 0.032,
        sandbox: 0.024
      },
      "fr-paris": {
        production: 0.032,
        sandbox: 0.024
      },
      "jp-tokyo": {
        production: 0.032,
        sandbox: 0.024
      },
      "pl-warsaw": {
        production: 0.032,
        sandbox: 0.024
      },
      "es-madrid": {
        production: 0.032,
        sandbox: 0.024
      },
      "kr-seoul": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-miami": {
        production: 0.032,
        sandbox: 0.024
      },
      "sg-singapore": {
        production: 0.032,
        sandbox: 0.024
      },
      "se-stockholm": {
        production: 0.032,
        sandbox: 0.024
      },
      "mx-mexico-city": {
        production: 0.032,
        sandbox: 0.024
      },
      "br-s-o-paulo": {
        production: 0.05,
        sandbox: 0.0375
      },
      "au-melbourne": {
        production: 0.032,
        sandbox: 0.024
      },
      "in-mumbai": {
        production: 0.032,
        sandbox: 0.024
      },
      "za-johannesburg": {
        production: 0.032,
        sandbox: 0.024
      },
      "il-tel-aviv": {
        production: 0.032,
        sandbox: 0.024
      },
      "in-bangalore": {
        production: 0.032,
        sandbox: 0.024
      },
      "in-delhi-ncr": {
        production: 0.032,
        sandbox: 0.024
      },
      "cl-santiago": {
        production: 0.032,
        sandbox: 0.024
      },
      "jp-osaka": {
        production: 0.032,
        sandbox: 0.024
      },
      "gb-manchester": {
        production: 0.032,
        sandbox: 0.024
      }
    }
  },
  {
    id: "high-frequency-2c-2gb",
    system: "high-frequency",
    cores: 2,
    ramGb: 2,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-chicago": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-dallas": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-seattle": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-los-angeles": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-atlanta": {
        production: 0.05,
        sandbox: 0.0375
      },
      "nl-amsterdam": {
        production: 0.05,
        sandbox: 0.0375
      },
      "gb-london": {
        production: 0.05,
        sandbox: 0.0375
      },
      "de-frankfurt": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-silicon-valley": {
        production: 0.05,
        sandbox: 0.0375
      },
      "au-sydney": {
        production: 0.05,
        sandbox: 0.0375
      },
      "ca-toronto": {
        production: 0.05,
        sandbox: 0.0375
      },
      "fr-paris": {
        production: 0.05,
        sandbox: 0.0375
      },
      "jp-tokyo": {
        production: 0.05,
        sandbox: 0.0375
      },
      "pl-warsaw": {
        production: 0.05,
        sandbox: 0.0375
      },
      "es-madrid": {
        production: 0.05,
        sandbox: 0.0375
      },
      "kr-seoul": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-miami": {
        production: 0.05,
        sandbox: 0.0375
      },
      "sg-singapore": {
        production: 0.05,
        sandbox: 0.0375
      },
      "se-stockholm": {
        production: 0.05,
        sandbox: 0.0375
      },
      "mx-mexico-city": {
        production: 0.05,
        sandbox: 0.0375
      },
      "br-s-o-paulo": {
        production: 0.074,
        sandbox: 0.0555
      },
      "au-melbourne": {
        production: 0.05,
        sandbox: 0.0375
      },
      "in-mumbai": {
        production: 0.05,
        sandbox: 0.0375
      },
      "za-johannesburg": {
        production: 0.05,
        sandbox: 0.0375
      },
      "il-tel-aviv": {
        production: 0.05,
        sandbox: 0.0375
      },
      "in-bangalore": {
        production: 0.05,
        sandbox: 0.0375
      },
      "in-delhi-ncr": {
        production: 0.05,
        sandbox: 0.0375
      },
      "cl-santiago": {
        production: 0.05,
        sandbox: 0.0375
      },
      "jp-osaka": {
        production: 0.05,
        sandbox: 0.0375
      },
      "gb-manchester": {
        production: 0.05,
        sandbox: 0.0375
      }
    }
  },
  {
    id: "high-frequency-2c-4gb",
    system: "high-frequency",
    cores: 2,
    ramGb: 4,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-chicago": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-dallas": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-seattle": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-los-angeles": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-atlanta": {
        production: 0.066,
        sandbox: 0.0495
      },
      "nl-amsterdam": {
        production: 0.066,
        sandbox: 0.0495
      },
      "gb-london": {
        production: 0.066,
        sandbox: 0.0495
      },
      "de-frankfurt": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-silicon-valley": {
        production: 0.066,
        sandbox: 0.0495
      },
      "au-sydney": {
        production: 0.066,
        sandbox: 0.0495
      },
      "ca-toronto": {
        production: 0.066,
        sandbox: 0.0495
      },
      "fr-paris": {
        production: 0.066,
        sandbox: 0.0495
      },
      "jp-tokyo": {
        production: 0.066,
        sandbox: 0.0495
      },
      "pl-warsaw": {
        production: 0.066,
        sandbox: 0.0495
      },
      "es-madrid": {
        production: 0.066,
        sandbox: 0.0495
      },
      "kr-seoul": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-miami": {
        production: 0.066,
        sandbox: 0.0495
      },
      "sg-singapore": {
        production: 0.066,
        sandbox: 0.0495
      },
      "se-stockholm": {
        production: 0.066,
        sandbox: 0.0495
      },
      "mx-mexico-city": {
        production: 0.066,
        sandbox: 0.0495
      },
      "br-s-o-paulo": {
        production: 0.098,
        sandbox: 0.0735
      },
      "au-melbourne": {
        production: 0.066,
        sandbox: 0.0495
      },
      "in-mumbai": {
        production: 0.066,
        sandbox: 0.0495
      },
      "za-johannesburg": {
        production: 0.066,
        sandbox: 0.0495
      },
      "il-tel-aviv": {
        production: 0.066,
        sandbox: 0.0495
      },
      "in-bangalore": {
        production: 0.066,
        sandbox: 0.0495
      },
      "in-delhi-ncr": {
        production: 0.066,
        sandbox: 0.0495
      },
      "cl-santiago": {
        production: 0.066,
        sandbox: 0.0495
      },
      "jp-osaka": {
        production: 0.066,
        sandbox: 0.0495
      },
      "gb-manchester": {
        production: 0.066,
        sandbox: 0.0495
      }
    }
  },
  {
    id: "high-frequency-3c-8gb",
    system: "high-frequency",
    cores: 3,
    ramGb: 8,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-chicago": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-dallas": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-seattle": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-los-angeles": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-atlanta": {
        production: 0.132,
        sandbox: 0.099
      },
      "nl-amsterdam": {
        production: 0.132,
        sandbox: 0.099
      },
      "gb-london": {
        production: 0.132,
        sandbox: 0.099
      },
      "de-frankfurt": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-silicon-valley": {
        production: 0.132,
        sandbox: 0.099
      },
      "au-sydney": {
        production: 0.132,
        sandbox: 0.099
      },
      "ca-toronto": {
        production: 0.132,
        sandbox: 0.099
      },
      "fr-paris": {
        production: 0.132,
        sandbox: 0.099
      },
      "jp-tokyo": {
        production: 0.132,
        sandbox: 0.099
      },
      "pl-warsaw": {
        production: 0.132,
        sandbox: 0.099
      },
      "es-madrid": {
        production: 0.132,
        sandbox: 0.099
      },
      "kr-seoul": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-miami": {
        production: 0.132,
        sandbox: 0.099
      },
      "sg-singapore": {
        production: 0.132,
        sandbox: 0.099
      },
      "se-stockholm": {
        production: 0.132,
        sandbox: 0.099
      },
      "mx-mexico-city": {
        production: 0.132,
        sandbox: 0.099
      },
      "br-s-o-paulo": {
        production: 0.198,
        sandbox: 0.1485
      },
      "au-melbourne": {
        production: 0.132,
        sandbox: 0.099
      },
      "in-mumbai": {
        production: 0.132,
        sandbox: 0.099
      },
      "za-johannesburg": {
        production: 0.132,
        sandbox: 0.099
      },
      "il-tel-aviv": {
        production: 0.132,
        sandbox: 0.099
      },
      "in-bangalore": {
        production: 0.132,
        sandbox: 0.099
      },
      "in-delhi-ncr": {
        production: 0.132,
        sandbox: 0.099
      },
      "cl-santiago": {
        production: 0.132,
        sandbox: 0.099
      },
      "jp-osaka": {
        production: 0.132,
        sandbox: 0.099
      },
      "gb-manchester": {
        production: 0.132,
        sandbox: 0.099
      }
    }
  },
  {
    id: "high-frequency-4c-16gb",
    system: "high-frequency",
    cores: 4,
    ramGb: 16,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "au-melbourne",
      "in-mumbai",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-chicago": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-seattle": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-los-angeles": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-atlanta": {
        production: 0.264,
        sandbox: 0.198
      },
      "nl-amsterdam": {
        production: 0.264,
        sandbox: 0.198
      },
      "gb-london": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-silicon-valley": {
        production: 0.264,
        sandbox: 0.198
      },
      "au-sydney": {
        production: 0.264,
        sandbox: 0.198
      },
      "ca-toronto": {
        production: 0.264,
        sandbox: 0.198
      },
      "fr-paris": {
        production: 0.264,
        sandbox: 0.198
      },
      "jp-tokyo": {
        production: 0.264,
        sandbox: 0.198
      },
      "pl-warsaw": {
        production: 0.264,
        sandbox: 0.198
      },
      "es-madrid": {
        production: 0.264,
        sandbox: 0.198
      },
      "kr-seoul": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-miami": {
        production: 0.264,
        sandbox: 0.198
      },
      "sg-singapore": {
        production: 0.264,
        sandbox: 0.198
      },
      "se-stockholm": {
        production: 0.264,
        sandbox: 0.198
      },
      "mx-mexico-city": {
        production: 0.264,
        sandbox: 0.198
      },
      "au-melbourne": {
        production: 0.264,
        sandbox: 0.198
      },
      "in-mumbai": {
        production: 0.264,
        sandbox: 0.198
      },
      "il-tel-aviv": {
        production: 0.264,
        sandbox: 0.198
      },
      "in-bangalore": {
        production: 0.264,
        sandbox: 0.198
      },
      "in-delhi-ncr": {
        production: 0.264,
        sandbox: 0.198
      },
      "jp-osaka": {
        production: 0.264,
        sandbox: 0.198
      },
      "gb-manchester": {
        production: 0.264,
        sandbox: 0.198
      }
    }
  },
  {
    id: "high-frequency-6c-24gb",
    system: "high-frequency",
    cores: 6,
    ramGb: 24,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-seattle",
      "us-los-angeles",
      "nl-amsterdam",
      "gb-london",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "au-melbourne",
      "in-mumbai",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-chicago": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-seattle": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-los-angeles": {
        production: 0.394,
        sandbox: 0.2955
      },
      "nl-amsterdam": {
        production: 0.394,
        sandbox: 0.2955
      },
      "gb-london": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-silicon-valley": {
        production: 0.394,
        sandbox: 0.2955
      },
      "au-sydney": {
        production: 0.394,
        sandbox: 0.2955
      },
      "ca-toronto": {
        production: 0.394,
        sandbox: 0.2955
      },
      "fr-paris": {
        production: 0.394,
        sandbox: 0.2955
      },
      "jp-tokyo": {
        production: 0.394,
        sandbox: 0.2955
      },
      "pl-warsaw": {
        production: 0.394,
        sandbox: 0.2955
      },
      "es-madrid": {
        production: 0.394,
        sandbox: 0.2955
      },
      "kr-seoul": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-miami": {
        production: 0.394,
        sandbox: 0.2955
      },
      "sg-singapore": {
        production: 0.394,
        sandbox: 0.2955
      },
      "se-stockholm": {
        production: 0.394,
        sandbox: 0.2955
      },
      "mx-mexico-city": {
        production: 0.394,
        sandbox: 0.2955
      },
      "au-melbourne": {
        production: 0.394,
        sandbox: 0.2955
      },
      "in-mumbai": {
        production: 0.394,
        sandbox: 0.2955
      },
      "il-tel-aviv": {
        production: 0.394,
        sandbox: 0.2955
      },
      "in-bangalore": {
        production: 0.394,
        sandbox: 0.2955
      },
      "in-delhi-ncr": {
        production: 0.394,
        sandbox: 0.2955
      },
      "jp-osaka": {
        production: 0.394,
        sandbox: 0.2955
      },
      "gb-manchester": {
        production: 0.394,
        sandbox: 0.2955
      }
    }
  },
  {
    id: "high-frequency-8c-32gb",
    system: "high-frequency",
    cores: 8,
    ramGb: 32,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-seattle",
      "nl-amsterdam",
      "gb-london",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "au-melbourne",
      "in-mumbai",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.526,
        sandbox: 0.3945
      },
      "us-chicago": {
        production: 0.526,
        sandbox: 0.3945
      },
      "us-seattle": {
        production: 0.526,
        sandbox: 0.3945
      },
      "nl-amsterdam": {
        production: 0.526,
        sandbox: 0.3945
      },
      "gb-london": {
        production: 0.526,
        sandbox: 0.3945
      },
      "us-silicon-valley": {
        production: 0.526,
        sandbox: 0.3945
      },
      "au-sydney": {
        production: 0.526,
        sandbox: 0.3945
      },
      "ca-toronto": {
        production: 0.526,
        sandbox: 0.3945
      },
      "fr-paris": {
        production: 0.526,
        sandbox: 0.3945
      },
      "jp-tokyo": {
        production: 0.526,
        sandbox: 0.3945
      },
      "pl-warsaw": {
        production: 0.526,
        sandbox: 0.3945
      },
      "es-madrid": {
        production: 0.526,
        sandbox: 0.3945
      },
      "kr-seoul": {
        production: 0.526,
        sandbox: 0.3945
      },
      "us-miami": {
        production: 0.526,
        sandbox: 0.3945
      },
      "sg-singapore": {
        production: 0.526,
        sandbox: 0.3945
      },
      "se-stockholm": {
        production: 0.526,
        sandbox: 0.3945
      },
      "mx-mexico-city": {
        production: 0.526,
        sandbox: 0.3945
      },
      "au-melbourne": {
        production: 0.526,
        sandbox: 0.3945
      },
      "in-mumbai": {
        production: 0.526,
        sandbox: 0.3945
      },
      "il-tel-aviv": {
        production: 0.526,
        sandbox: 0.3945
      },
      "in-bangalore": {
        production: 0.526,
        sandbox: 0.3945
      },
      "in-delhi-ncr": {
        production: 0.526,
        sandbox: 0.3945
      },
      "jp-osaka": {
        production: 0.526,
        sandbox: 0.3945
      },
      "gb-manchester": {
        production: 0.526,
        sandbox: 0.3945
      }
    }
  },
  {
    id: "high-frequency-12c-48gb",
    system: "high-frequency",
    cores: 12,
    ramGb: 48,
    regions: [
      "us-seattle",
      "gb-london",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "mx-mexico-city",
      "in-mumbai",
      "in-bangalore",
      "in-delhi-ncr",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-seattle": {
        production: 0.702,
        sandbox: 0.5265
      },
      "gb-london": {
        production: 0.702,
        sandbox: 0.5265
      },
      "us-silicon-valley": {
        production: 0.702,
        sandbox: 0.5265
      },
      "au-sydney": {
        production: 0.702,
        sandbox: 0.5265
      },
      "ca-toronto": {
        production: 0.702,
        sandbox: 0.5265
      },
      "fr-paris": {
        production: 0.702,
        sandbox: 0.5265
      },
      "jp-tokyo": {
        production: 0.702,
        sandbox: 0.5265
      },
      "pl-warsaw": {
        production: 0.702,
        sandbox: 0.5265
      },
      "es-madrid": {
        production: 0.702,
        sandbox: 0.5265
      },
      "kr-seoul": {
        production: 0.702,
        sandbox: 0.5265
      },
      "us-miami": {
        production: 0.702,
        sandbox: 0.5265
      },
      "mx-mexico-city": {
        production: 0.702,
        sandbox: 0.5265
      },
      "in-mumbai": {
        production: 0.702,
        sandbox: 0.5265
      },
      "in-bangalore": {
        production: 0.702,
        sandbox: 0.5265
      },
      "in-delhi-ncr": {
        production: 0.702,
        sandbox: 0.5265
      },
      "jp-osaka": {
        production: 0.702,
        sandbox: 0.5265
      },
      "gb-manchester": {
        production: 0.702,
        sandbox: 0.5265
      }
    }
  },
  {
    id: "high-frequency-16c-58gb",
    system: "high-frequency",
    cores: 16,
    ramGb: 58,
    regions: [
      "us-seattle",
      "gb-london",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "mx-mexico-city",
      "in-mumbai",
      "in-bangalore",
      "in-delhi-ncr",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-seattle": {
        production: 0.876,
        sandbox: 0.657
      },
      "gb-london": {
        production: 0.876,
        sandbox: 0.657
      },
      "us-silicon-valley": {
        production: 0.876,
        sandbox: 0.657
      },
      "au-sydney": {
        production: 0.876,
        sandbox: 0.657
      },
      "ca-toronto": {
        production: 0.876,
        sandbox: 0.657
      },
      "fr-paris": {
        production: 0.876,
        sandbox: 0.657
      },
      "jp-tokyo": {
        production: 0.876,
        sandbox: 0.657
      },
      "pl-warsaw": {
        production: 0.876,
        sandbox: 0.657
      },
      "es-madrid": {
        production: 0.876,
        sandbox: 0.657
      },
      "kr-seoul": {
        production: 0.876,
        sandbox: 0.657
      },
      "mx-mexico-city": {
        production: 0.876,
        sandbox: 0.657
      },
      "in-mumbai": {
        production: 0.876,
        sandbox: 0.657
      },
      "in-bangalore": {
        production: 0.876,
        sandbox: 0.657
      },
      "in-delhi-ncr": {
        production: 0.876,
        sandbox: 0.657
      },
      "jp-osaka": {
        production: 0.876,
        sandbox: 0.657
      },
      "gb-manchester": {
        production: 0.876,
        sandbox: 0.657
      }
    }
  },
  {
    id: "performance-amd-1c-2gb",
    system: "performance-amd",
    cores: 1,
    ramGb: 2,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-chicago": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-dallas": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-seattle": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-los-angeles": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-atlanta": {
        production: 0.032,
        sandbox: 0.024
      },
      "nl-amsterdam": {
        production: 0.032,
        sandbox: 0.024
      },
      "gb-london": {
        production: 0.032,
        sandbox: 0.024
      },
      "de-frankfurt": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-silicon-valley": {
        production: 0.032,
        sandbox: 0.024
      },
      "au-sydney": {
        production: 0.032,
        sandbox: 0.024
      },
      "ca-toronto": {
        production: 0.032,
        sandbox: 0.024
      },
      "fr-paris": {
        production: 0.032,
        sandbox: 0.024
      },
      "jp-tokyo": {
        production: 0.032,
        sandbox: 0.024
      },
      "pl-warsaw": {
        production: 0.032,
        sandbox: 0.024
      },
      "es-madrid": {
        production: 0.032,
        sandbox: 0.024
      },
      "kr-seoul": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-miami": {
        production: 0.032,
        sandbox: 0.024
      },
      "sg-singapore": {
        production: 0.032,
        sandbox: 0.024
      },
      "se-stockholm": {
        production: 0.032,
        sandbox: 0.024
      },
      "mx-mexico-city": {
        production: 0.032,
        sandbox: 0.024
      },
      "br-s-o-paulo": {
        production: 0.05,
        sandbox: 0.0375
      },
      "au-melbourne": {
        production: 0.032,
        sandbox: 0.024
      },
      "in-mumbai": {
        production: 0.032,
        sandbox: 0.024
      },
      "za-johannesburg": {
        production: 0.032,
        sandbox: 0.024
      },
      "il-tel-aviv": {
        production: 0.032,
        sandbox: 0.024
      },
      "in-bangalore": {
        production: 0.032,
        sandbox: 0.024
      },
      "in-delhi-ncr": {
        production: 0.032,
        sandbox: 0.024
      },
      "cl-santiago": {
        production: 0.032,
        sandbox: 0.024
      },
      "jp-osaka": {
        production: 0.032,
        sandbox: 0.024
      },
      "gb-manchester": {
        production: 0.032,
        sandbox: 0.024
      }
    }
  },
  {
    id: "performance-amd-2c-2gb",
    system: "performance-amd",
    cores: 2,
    ramGb: 2,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-chicago": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-dallas": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-seattle": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-los-angeles": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-atlanta": {
        production: 0.05,
        sandbox: 0.0375
      },
      "nl-amsterdam": {
        production: 0.05,
        sandbox: 0.0375
      },
      "gb-london": {
        production: 0.05,
        sandbox: 0.0375
      },
      "de-frankfurt": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-silicon-valley": {
        production: 0.05,
        sandbox: 0.0375
      },
      "au-sydney": {
        production: 0.05,
        sandbox: 0.0375
      },
      "ca-toronto": {
        production: 0.05,
        sandbox: 0.0375
      },
      "fr-paris": {
        production: 0.05,
        sandbox: 0.0375
      },
      "jp-tokyo": {
        production: 0.05,
        sandbox: 0.0375
      },
      "pl-warsaw": {
        production: 0.05,
        sandbox: 0.0375
      },
      "es-madrid": {
        production: 0.05,
        sandbox: 0.0375
      },
      "kr-seoul": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-miami": {
        production: 0.05,
        sandbox: 0.0375
      },
      "sg-singapore": {
        production: 0.05,
        sandbox: 0.0375
      },
      "se-stockholm": {
        production: 0.05,
        sandbox: 0.0375
      },
      "mx-mexico-city": {
        production: 0.05,
        sandbox: 0.0375
      },
      "br-s-o-paulo": {
        production: 0.074,
        sandbox: 0.0555
      },
      "au-melbourne": {
        production: 0.05,
        sandbox: 0.0375
      },
      "in-mumbai": {
        production: 0.05,
        sandbox: 0.0375
      },
      "za-johannesburg": {
        production: 0.05,
        sandbox: 0.0375
      },
      "il-tel-aviv": {
        production: 0.05,
        sandbox: 0.0375
      },
      "in-bangalore": {
        production: 0.05,
        sandbox: 0.0375
      },
      "in-delhi-ncr": {
        production: 0.05,
        sandbox: 0.0375
      },
      "cl-santiago": {
        production: 0.05,
        sandbox: 0.0375
      },
      "jp-osaka": {
        production: 0.05,
        sandbox: 0.0375
      },
      "gb-manchester": {
        production: 0.05,
        sandbox: 0.0375
      }
    }
  },
  {
    id: "performance-amd-2c-4gb",
    system: "performance-amd",
    cores: 2,
    ramGb: 4,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-chicago": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-dallas": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-seattle": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-los-angeles": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-atlanta": {
        production: 0.066,
        sandbox: 0.0495
      },
      "nl-amsterdam": {
        production: 0.066,
        sandbox: 0.0495
      },
      "gb-london": {
        production: 0.066,
        sandbox: 0.0495
      },
      "de-frankfurt": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-silicon-valley": {
        production: 0.066,
        sandbox: 0.0495
      },
      "au-sydney": {
        production: 0.066,
        sandbox: 0.0495
      },
      "ca-toronto": {
        production: 0.066,
        sandbox: 0.0495
      },
      "fr-paris": {
        production: 0.066,
        sandbox: 0.0495
      },
      "jp-tokyo": {
        production: 0.066,
        sandbox: 0.0495
      },
      "pl-warsaw": {
        production: 0.066,
        sandbox: 0.0495
      },
      "es-madrid": {
        production: 0.066,
        sandbox: 0.0495
      },
      "kr-seoul": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-miami": {
        production: 0.066,
        sandbox: 0.0495
      },
      "sg-singapore": {
        production: 0.066,
        sandbox: 0.0495
      },
      "se-stockholm": {
        production: 0.066,
        sandbox: 0.0495
      },
      "mx-mexico-city": {
        production: 0.066,
        sandbox: 0.0495
      },
      "br-s-o-paulo": {
        production: 0.098,
        sandbox: 0.0735
      },
      "au-melbourne": {
        production: 0.066,
        sandbox: 0.0495
      },
      "in-mumbai": {
        production: 0.066,
        sandbox: 0.0495
      },
      "za-johannesburg": {
        production: 0.066,
        sandbox: 0.0495
      },
      "il-tel-aviv": {
        production: 0.066,
        sandbox: 0.0495
      },
      "in-bangalore": {
        production: 0.066,
        sandbox: 0.0495
      },
      "in-delhi-ncr": {
        production: 0.066,
        sandbox: 0.0495
      },
      "cl-santiago": {
        production: 0.066,
        sandbox: 0.0495
      },
      "jp-osaka": {
        production: 0.066,
        sandbox: 0.0495
      },
      "gb-manchester": {
        production: 0.066,
        sandbox: 0.0495
      }
    }
  },
  {
    id: "performance-amd-4c-8gb",
    system: "performance-amd",
    cores: 4,
    ramGb: 8,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-chicago": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-dallas": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-seattle": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-los-angeles": {
        production: 0.132,
        sandbox: 0.099
      },
      "nl-amsterdam": {
        production: 0.132,
        sandbox: 0.099
      },
      "gb-london": {
        production: 0.132,
        sandbox: 0.099
      },
      "de-frankfurt": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-silicon-valley": {
        production: 0.132,
        sandbox: 0.099
      },
      "au-sydney": {
        production: 0.132,
        sandbox: 0.099
      },
      "ca-toronto": {
        production: 0.132,
        sandbox: 0.099
      },
      "fr-paris": {
        production: 0.132,
        sandbox: 0.099
      },
      "jp-tokyo": {
        production: 0.132,
        sandbox: 0.099
      },
      "pl-warsaw": {
        production: 0.132,
        sandbox: 0.099
      },
      "es-madrid": {
        production: 0.132,
        sandbox: 0.099
      },
      "kr-seoul": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-miami": {
        production: 0.132,
        sandbox: 0.099
      },
      "sg-singapore": {
        production: 0.132,
        sandbox: 0.099
      },
      "se-stockholm": {
        production: 0.132,
        sandbox: 0.099
      },
      "mx-mexico-city": {
        production: 0.132,
        sandbox: 0.099
      },
      "br-s-o-paulo": {
        production: 0.198,
        sandbox: 0.1485
      },
      "au-melbourne": {
        production: 0.132,
        sandbox: 0.099
      },
      "in-mumbai": {
        production: 0.132,
        sandbox: 0.099
      },
      "za-johannesburg": {
        production: 0.132,
        sandbox: 0.099
      },
      "il-tel-aviv": {
        production: 0.132,
        sandbox: 0.099
      },
      "in-bangalore": {
        production: 0.132,
        sandbox: 0.099
      },
      "in-delhi-ncr": {
        production: 0.132,
        sandbox: 0.099
      },
      "cl-santiago": {
        production: 0.132,
        sandbox: 0.099
      },
      "jp-osaka": {
        production: 0.132,
        sandbox: 0.099
      },
      "gb-manchester": {
        production: 0.132,
        sandbox: 0.099
      }
    }
  },
  {
    id: "performance-amd-4c-12gb",
    system: "performance-amd",
    cores: 4,
    ramGb: 12,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.198,
        sandbox: 0.1485
      },
      "us-chicago": {
        production: 0.198,
        sandbox: 0.1485
      },
      "us-dallas": {
        production: 0.198,
        sandbox: 0.1485
      },
      "us-seattle": {
        production: 0.198,
        sandbox: 0.1485
      },
      "us-los-angeles": {
        production: 0.198,
        sandbox: 0.1485
      },
      "nl-amsterdam": {
        production: 0.198,
        sandbox: 0.1485
      },
      "gb-london": {
        production: 0.198,
        sandbox: 0.1485
      },
      "de-frankfurt": {
        production: 0.198,
        sandbox: 0.1485
      },
      "us-silicon-valley": {
        production: 0.198,
        sandbox: 0.1485
      },
      "au-sydney": {
        production: 0.198,
        sandbox: 0.1485
      },
      "ca-toronto": {
        production: 0.198,
        sandbox: 0.1485
      },
      "fr-paris": {
        production: 0.198,
        sandbox: 0.1485
      },
      "jp-tokyo": {
        production: 0.198,
        sandbox: 0.1485
      },
      "pl-warsaw": {
        production: 0.198,
        sandbox: 0.1485
      },
      "es-madrid": {
        production: 0.198,
        sandbox: 0.1485
      },
      "kr-seoul": {
        production: 0.198,
        sandbox: 0.1485
      },
      "us-miami": {
        production: 0.198,
        sandbox: 0.1485
      },
      "sg-singapore": {
        production: 0.198,
        sandbox: 0.1485
      },
      "se-stockholm": {
        production: 0.198,
        sandbox: 0.1485
      },
      "mx-mexico-city": {
        production: 0.198,
        sandbox: 0.1485
      },
      "br-s-o-paulo": {
        production: 0.296,
        sandbox: 0.222
      },
      "au-melbourne": {
        production: 0.198,
        sandbox: 0.1485
      },
      "in-mumbai": {
        production: 0.198,
        sandbox: 0.1485
      },
      "za-johannesburg": {
        production: 0.198,
        sandbox: 0.1485
      },
      "il-tel-aviv": {
        production: 0.198,
        sandbox: 0.1485
      },
      "in-bangalore": {
        production: 0.198,
        sandbox: 0.1485
      },
      "in-delhi-ncr": {
        production: 0.198,
        sandbox: 0.1485
      },
      "cl-santiago": {
        production: 0.198,
        sandbox: 0.1485
      },
      "jp-osaka": {
        production: 0.198,
        sandbox: 0.1485
      },
      "gb-manchester": {
        production: 0.198,
        sandbox: 0.1485
      }
    }
  },
  {
    id: "performance-amd-8c-16gb",
    system: "performance-amd",
    cores: 8,
    ramGb: 16,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-chicago": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-dallas": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-seattle": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-los-angeles": {
        production: 0.264,
        sandbox: 0.198
      },
      "nl-amsterdam": {
        production: 0.264,
        sandbox: 0.198
      },
      "gb-london": {
        production: 0.264,
        sandbox: 0.198
      },
      "de-frankfurt": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-silicon-valley": {
        production: 0.264,
        sandbox: 0.198
      },
      "au-sydney": {
        production: 0.264,
        sandbox: 0.198
      },
      "ca-toronto": {
        production: 0.264,
        sandbox: 0.198
      },
      "fr-paris": {
        production: 0.264,
        sandbox: 0.198
      },
      "jp-tokyo": {
        production: 0.264,
        sandbox: 0.198
      },
      "pl-warsaw": {
        production: 0.264,
        sandbox: 0.198
      },
      "es-madrid": {
        production: 0.264,
        sandbox: 0.198
      },
      "kr-seoul": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-miami": {
        production: 0.264,
        sandbox: 0.198
      },
      "sg-singapore": {
        production: 0.264,
        sandbox: 0.198
      },
      "se-stockholm": {
        production: 0.264,
        sandbox: 0.198
      },
      "mx-mexico-city": {
        production: 0.264,
        sandbox: 0.198
      },
      "br-s-o-paulo": {
        production: 0.394,
        sandbox: 0.2955
      },
      "au-melbourne": {
        production: 0.264,
        sandbox: 0.198
      },
      "in-mumbai": {
        production: 0.264,
        sandbox: 0.198
      },
      "za-johannesburg": {
        production: 0.264,
        sandbox: 0.198
      },
      "il-tel-aviv": {
        production: 0.264,
        sandbox: 0.198
      },
      "in-bangalore": {
        production: 0.264,
        sandbox: 0.198
      },
      "in-delhi-ncr": {
        production: 0.264,
        sandbox: 0.198
      },
      "cl-santiago": {
        production: 0.264,
        sandbox: 0.198
      },
      "jp-osaka": {
        production: 0.264,
        sandbox: 0.198
      },
      "gb-manchester": {
        production: 0.264,
        sandbox: 0.198
      }
    }
  },
  {
    id: "performance-amd-12c-24gb",
    system: "performance-amd",
    cores: 12,
    ramGb: 24,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-chicago": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-dallas": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-seattle": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-los-angeles": {
        production: 0.394,
        sandbox: 0.2955
      },
      "nl-amsterdam": {
        production: 0.394,
        sandbox: 0.2955
      },
      "gb-london": {
        production: 0.394,
        sandbox: 0.2955
      },
      "de-frankfurt": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-silicon-valley": {
        production: 0.394,
        sandbox: 0.2955
      },
      "au-sydney": {
        production: 0.394,
        sandbox: 0.2955
      },
      "ca-toronto": {
        production: 0.394,
        sandbox: 0.2955
      },
      "fr-paris": {
        production: 0.394,
        sandbox: 0.2955
      },
      "jp-tokyo": {
        production: 0.394,
        sandbox: 0.2955
      },
      "pl-warsaw": {
        production: 0.394,
        sandbox: 0.2955
      },
      "es-madrid": {
        production: 0.394,
        sandbox: 0.2955
      },
      "kr-seoul": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-miami": {
        production: 0.394,
        sandbox: 0.2955
      },
      "sg-singapore": {
        production: 0.394,
        sandbox: 0.2955
      },
      "se-stockholm": {
        production: 0.394,
        sandbox: 0.2955
      },
      "mx-mexico-city": {
        production: 0.394,
        sandbox: 0.2955
      },
      "br-s-o-paulo": {
        production: 0.592,
        sandbox: 0.444
      },
      "au-melbourne": {
        production: 0.394,
        sandbox: 0.2955
      },
      "in-mumbai": {
        production: 0.394,
        sandbox: 0.2955
      },
      "za-johannesburg": {
        production: 0.394,
        sandbox: 0.2955
      },
      "il-tel-aviv": {
        production: 0.394,
        sandbox: 0.2955
      },
      "in-bangalore": {
        production: 0.394,
        sandbox: 0.2955
      },
      "in-delhi-ncr": {
        production: 0.394,
        sandbox: 0.2955
      },
      "cl-santiago": {
        production: 0.394,
        sandbox: 0.2955
      },
      "jp-osaka": {
        production: 0.394,
        sandbox: 0.2955
      },
      "gb-manchester": {
        production: 0.394,
        sandbox: 0.2955
      }
    }
  },
  {
    id: "performance-intel-1c-2gb",
    system: "performance-intel",
    cores: 1,
    ramGb: 2,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "us-honolulu",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-chicago": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-dallas": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-seattle": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-los-angeles": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-atlanta": {
        production: 0.032,
        sandbox: 0.024
      },
      "nl-amsterdam": {
        production: 0.032,
        sandbox: 0.024
      },
      "gb-london": {
        production: 0.032,
        sandbox: 0.024
      },
      "de-frankfurt": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-silicon-valley": {
        production: 0.032,
        sandbox: 0.024
      },
      "au-sydney": {
        production: 0.032,
        sandbox: 0.024
      },
      "ca-toronto": {
        production: 0.032,
        sandbox: 0.024
      },
      "fr-paris": {
        production: 0.032,
        sandbox: 0.024
      },
      "jp-tokyo": {
        production: 0.032,
        sandbox: 0.024
      },
      "pl-warsaw": {
        production: 0.032,
        sandbox: 0.024
      },
      "es-madrid": {
        production: 0.032,
        sandbox: 0.024
      },
      "kr-seoul": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-miami": {
        production: 0.032,
        sandbox: 0.024
      },
      "sg-singapore": {
        production: 0.032,
        sandbox: 0.024
      },
      "se-stockholm": {
        production: 0.032,
        sandbox: 0.024
      },
      "mx-mexico-city": {
        production: 0.032,
        sandbox: 0.024
      },
      "br-s-o-paulo": {
        production: 0.05,
        sandbox: 0.0375
      },
      "au-melbourne": {
        production: 0.032,
        sandbox: 0.024
      },
      "us-honolulu": {
        production: 0.032,
        sandbox: 0.024
      },
      "in-mumbai": {
        production: 0.032,
        sandbox: 0.024
      },
      "za-johannesburg": {
        production: 0.032,
        sandbox: 0.024
      },
      "il-tel-aviv": {
        production: 0.032,
        sandbox: 0.024
      },
      "in-bangalore": {
        production: 0.032,
        sandbox: 0.024
      },
      "in-delhi-ncr": {
        production: 0.032,
        sandbox: 0.024
      },
      "cl-santiago": {
        production: 0.032,
        sandbox: 0.024
      },
      "jp-osaka": {
        production: 0.032,
        sandbox: 0.024
      },
      "gb-manchester": {
        production: 0.032,
        sandbox: 0.024
      }
    }
  },
  {
    id: "performance-intel-2c-2gb",
    system: "performance-intel",
    cores: 2,
    ramGb: 2,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "us-honolulu",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-chicago": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-dallas": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-seattle": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-los-angeles": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-atlanta": {
        production: 0.05,
        sandbox: 0.0375
      },
      "nl-amsterdam": {
        production: 0.05,
        sandbox: 0.0375
      },
      "gb-london": {
        production: 0.05,
        sandbox: 0.0375
      },
      "de-frankfurt": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-silicon-valley": {
        production: 0.05,
        sandbox: 0.0375
      },
      "au-sydney": {
        production: 0.05,
        sandbox: 0.0375
      },
      "ca-toronto": {
        production: 0.05,
        sandbox: 0.0375
      },
      "fr-paris": {
        production: 0.05,
        sandbox: 0.0375
      },
      "jp-tokyo": {
        production: 0.05,
        sandbox: 0.0375
      },
      "pl-warsaw": {
        production: 0.05,
        sandbox: 0.0375
      },
      "es-madrid": {
        production: 0.05,
        sandbox: 0.0375
      },
      "kr-seoul": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-miami": {
        production: 0.05,
        sandbox: 0.0375
      },
      "sg-singapore": {
        production: 0.05,
        sandbox: 0.0375
      },
      "se-stockholm": {
        production: 0.05,
        sandbox: 0.0375
      },
      "mx-mexico-city": {
        production: 0.05,
        sandbox: 0.0375
      },
      "br-s-o-paulo": {
        production: 0.074,
        sandbox: 0.0555
      },
      "au-melbourne": {
        production: 0.05,
        sandbox: 0.0375
      },
      "us-honolulu": {
        production: 0.05,
        sandbox: 0.0375
      },
      "in-mumbai": {
        production: 0.05,
        sandbox: 0.0375
      },
      "za-johannesburg": {
        production: 0.05,
        sandbox: 0.0375
      },
      "il-tel-aviv": {
        production: 0.05,
        sandbox: 0.0375
      },
      "in-bangalore": {
        production: 0.05,
        sandbox: 0.0375
      },
      "in-delhi-ncr": {
        production: 0.05,
        sandbox: 0.0375
      },
      "cl-santiago": {
        production: 0.05,
        sandbox: 0.0375
      },
      "jp-osaka": {
        production: 0.05,
        sandbox: 0.0375
      },
      "gb-manchester": {
        production: 0.05,
        sandbox: 0.0375
      }
    }
  },
  {
    id: "performance-intel-2c-4gb",
    system: "performance-intel",
    cores: 2,
    ramGb: 4,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "us-honolulu",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-chicago": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-dallas": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-seattle": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-los-angeles": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-atlanta": {
        production: 0.066,
        sandbox: 0.0495
      },
      "nl-amsterdam": {
        production: 0.066,
        sandbox: 0.0495
      },
      "gb-london": {
        production: 0.066,
        sandbox: 0.0495
      },
      "de-frankfurt": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-silicon-valley": {
        production: 0.066,
        sandbox: 0.0495
      },
      "au-sydney": {
        production: 0.066,
        sandbox: 0.0495
      },
      "ca-toronto": {
        production: 0.066,
        sandbox: 0.0495
      },
      "fr-paris": {
        production: 0.066,
        sandbox: 0.0495
      },
      "jp-tokyo": {
        production: 0.066,
        sandbox: 0.0495
      },
      "pl-warsaw": {
        production: 0.066,
        sandbox: 0.0495
      },
      "es-madrid": {
        production: 0.066,
        sandbox: 0.0495
      },
      "kr-seoul": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-miami": {
        production: 0.066,
        sandbox: 0.0495
      },
      "sg-singapore": {
        production: 0.066,
        sandbox: 0.0495
      },
      "se-stockholm": {
        production: 0.066,
        sandbox: 0.0495
      },
      "mx-mexico-city": {
        production: 0.066,
        sandbox: 0.0495
      },
      "br-s-o-paulo": {
        production: 0.098,
        sandbox: 0.0735
      },
      "au-melbourne": {
        production: 0.066,
        sandbox: 0.0495
      },
      "us-honolulu": {
        production: 0.066,
        sandbox: 0.0495
      },
      "in-mumbai": {
        production: 0.066,
        sandbox: 0.0495
      },
      "za-johannesburg": {
        production: 0.066,
        sandbox: 0.0495
      },
      "il-tel-aviv": {
        production: 0.066,
        sandbox: 0.0495
      },
      "in-bangalore": {
        production: 0.066,
        sandbox: 0.0495
      },
      "in-delhi-ncr": {
        production: 0.066,
        sandbox: 0.0495
      },
      "cl-santiago": {
        production: 0.066,
        sandbox: 0.0495
      },
      "jp-osaka": {
        production: 0.066,
        sandbox: 0.0495
      },
      "gb-manchester": {
        production: 0.066,
        sandbox: 0.0495
      }
    }
  },
  {
    id: "performance-intel-4c-8gb",
    system: "performance-intel",
    cores: 4,
    ramGb: 8,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "us-honolulu",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-chicago": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-dallas": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-seattle": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-los-angeles": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-atlanta": {
        production: 0.132,
        sandbox: 0.099
      },
      "nl-amsterdam": {
        production: 0.132,
        sandbox: 0.099
      },
      "gb-london": {
        production: 0.132,
        sandbox: 0.099
      },
      "de-frankfurt": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-silicon-valley": {
        production: 0.132,
        sandbox: 0.099
      },
      "au-sydney": {
        production: 0.132,
        sandbox: 0.099
      },
      "ca-toronto": {
        production: 0.132,
        sandbox: 0.099
      },
      "fr-paris": {
        production: 0.132,
        sandbox: 0.099
      },
      "jp-tokyo": {
        production: 0.132,
        sandbox: 0.099
      },
      "pl-warsaw": {
        production: 0.132,
        sandbox: 0.099
      },
      "es-madrid": {
        production: 0.132,
        sandbox: 0.099
      },
      "kr-seoul": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-miami": {
        production: 0.132,
        sandbox: 0.099
      },
      "sg-singapore": {
        production: 0.132,
        sandbox: 0.099
      },
      "se-stockholm": {
        production: 0.132,
        sandbox: 0.099
      },
      "mx-mexico-city": {
        production: 0.132,
        sandbox: 0.099
      },
      "br-s-o-paulo": {
        production: 0.198,
        sandbox: 0.1485
      },
      "au-melbourne": {
        production: 0.132,
        sandbox: 0.099
      },
      "us-honolulu": {
        production: 0.132,
        sandbox: 0.099
      },
      "in-mumbai": {
        production: 0.132,
        sandbox: 0.099
      },
      "za-johannesburg": {
        production: 0.132,
        sandbox: 0.099
      },
      "il-tel-aviv": {
        production: 0.132,
        sandbox: 0.099
      },
      "in-bangalore": {
        production: 0.132,
        sandbox: 0.099
      },
      "in-delhi-ncr": {
        production: 0.132,
        sandbox: 0.099
      },
      "cl-santiago": {
        production: 0.132,
        sandbox: 0.099
      },
      "jp-osaka": {
        production: 0.132,
        sandbox: 0.099
      },
      "gb-manchester": {
        production: 0.132,
        sandbox: 0.099
      }
    }
  },
  {
    id: "performance-intel-4c-12gb",
    system: "performance-intel",
    cores: 4,
    ramGb: 12,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "us-honolulu",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.198,
        sandbox: 0.1485
      },
      "us-chicago": {
        production: 0.198,
        sandbox: 0.1485
      },
      "us-dallas": {
        production: 0.198,
        sandbox: 0.1485
      },
      "us-seattle": {
        production: 0.198,
        sandbox: 0.1485
      },
      "us-los-angeles": {
        production: 0.198,
        sandbox: 0.1485
      },
      "us-atlanta": {
        production: 0.198,
        sandbox: 0.1485
      },
      "nl-amsterdam": {
        production: 0.198,
        sandbox: 0.1485
      },
      "gb-london": {
        production: 0.198,
        sandbox: 0.1485
      },
      "de-frankfurt": {
        production: 0.198,
        sandbox: 0.1485
      },
      "us-silicon-valley": {
        production: 0.198,
        sandbox: 0.1485
      },
      "au-sydney": {
        production: 0.198,
        sandbox: 0.1485
      },
      "ca-toronto": {
        production: 0.198,
        sandbox: 0.1485
      },
      "fr-paris": {
        production: 0.198,
        sandbox: 0.1485
      },
      "jp-tokyo": {
        production: 0.198,
        sandbox: 0.1485
      },
      "pl-warsaw": {
        production: 0.198,
        sandbox: 0.1485
      },
      "es-madrid": {
        production: 0.198,
        sandbox: 0.1485
      },
      "kr-seoul": {
        production: 0.198,
        sandbox: 0.1485
      },
      "us-miami": {
        production: 0.198,
        sandbox: 0.1485
      },
      "sg-singapore": {
        production: 0.198,
        sandbox: 0.1485
      },
      "se-stockholm": {
        production: 0.198,
        sandbox: 0.1485
      },
      "mx-mexico-city": {
        production: 0.198,
        sandbox: 0.1485
      },
      "br-s-o-paulo": {
        production: 0.296,
        sandbox: 0.222
      },
      "au-melbourne": {
        production: 0.198,
        sandbox: 0.1485
      },
      "us-honolulu": {
        production: 0.198,
        sandbox: 0.1485
      },
      "in-mumbai": {
        production: 0.198,
        sandbox: 0.1485
      },
      "za-johannesburg": {
        production: 0.198,
        sandbox: 0.1485
      },
      "il-tel-aviv": {
        production: 0.198,
        sandbox: 0.1485
      },
      "in-bangalore": {
        production: 0.198,
        sandbox: 0.1485
      },
      "in-delhi-ncr": {
        production: 0.198,
        sandbox: 0.1485
      },
      "cl-santiago": {
        production: 0.198,
        sandbox: 0.1485
      },
      "jp-osaka": {
        production: 0.198,
        sandbox: 0.1485
      },
      "gb-manchester": {
        production: 0.198,
        sandbox: 0.1485
      }
    }
  },
  {
    id: "performance-intel-8c-16gb",
    system: "performance-intel",
    cores: 8,
    ramGb: 16,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "us-honolulu",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-chicago": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-dallas": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-seattle": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-los-angeles": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-atlanta": {
        production: 0.264,
        sandbox: 0.198
      },
      "nl-amsterdam": {
        production: 0.264,
        sandbox: 0.198
      },
      "gb-london": {
        production: 0.264,
        sandbox: 0.198
      },
      "de-frankfurt": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-silicon-valley": {
        production: 0.264,
        sandbox: 0.198
      },
      "au-sydney": {
        production: 0.264,
        sandbox: 0.198
      },
      "ca-toronto": {
        production: 0.264,
        sandbox: 0.198
      },
      "fr-paris": {
        production: 0.264,
        sandbox: 0.198
      },
      "jp-tokyo": {
        production: 0.264,
        sandbox: 0.198
      },
      "pl-warsaw": {
        production: 0.264,
        sandbox: 0.198
      },
      "es-madrid": {
        production: 0.264,
        sandbox: 0.198
      },
      "kr-seoul": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-miami": {
        production: 0.264,
        sandbox: 0.198
      },
      "sg-singapore": {
        production: 0.264,
        sandbox: 0.198
      },
      "se-stockholm": {
        production: 0.264,
        sandbox: 0.198
      },
      "mx-mexico-city": {
        production: 0.264,
        sandbox: 0.198
      },
      "br-s-o-paulo": {
        production: 0.394,
        sandbox: 0.2955
      },
      "au-melbourne": {
        production: 0.264,
        sandbox: 0.198
      },
      "us-honolulu": {
        production: 0.264,
        sandbox: 0.198
      },
      "in-mumbai": {
        production: 0.264,
        sandbox: 0.198
      },
      "za-johannesburg": {
        production: 0.264,
        sandbox: 0.198
      },
      "il-tel-aviv": {
        production: 0.264,
        sandbox: 0.198
      },
      "in-bangalore": {
        production: 0.264,
        sandbox: 0.198
      },
      "in-delhi-ncr": {
        production: 0.264,
        sandbox: 0.198
      },
      "cl-santiago": {
        production: 0.264,
        sandbox: 0.198
      },
      "jp-osaka": {
        production: 0.264,
        sandbox: 0.198
      },
      "gb-manchester": {
        production: 0.264,
        sandbox: 0.198
      }
    }
  },
  {
    id: "performance-intel-12c-24gb",
    system: "performance-intel",
    cores: 12,
    ramGb: 24,
    regions: [
      "us-new-jersey",
      "us-chicago",
      "us-dallas",
      "us-seattle",
      "us-los-angeles",
      "us-atlanta",
      "nl-amsterdam",
      "gb-london",
      "de-frankfurt",
      "us-silicon-valley",
      "au-sydney",
      "ca-toronto",
      "fr-paris",
      "jp-tokyo",
      "pl-warsaw",
      "es-madrid",
      "kr-seoul",
      "us-miami",
      "sg-singapore",
      "se-stockholm",
      "mx-mexico-city",
      "br-s-o-paulo",
      "au-melbourne",
      "us-honolulu",
      "in-mumbai",
      "za-johannesburg",
      "il-tel-aviv",
      "in-bangalore",
      "in-delhi-ncr",
      "cl-santiago",
      "jp-osaka",
      "gb-manchester"
    ],
    rates: {
      "us-new-jersey": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-chicago": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-dallas": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-seattle": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-los-angeles": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-atlanta": {
        production: 0.394,
        sandbox: 0.2955
      },
      "nl-amsterdam": {
        production: 0.394,
        sandbox: 0.2955
      },
      "gb-london": {
        production: 0.394,
        sandbox: 0.2955
      },
      "de-frankfurt": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-silicon-valley": {
        production: 0.394,
        sandbox: 0.2955
      },
      "au-sydney": {
        production: 0.394,
        sandbox: 0.2955
      },
      "ca-toronto": {
        production: 0.394,
        sandbox: 0.2955
      },
      "fr-paris": {
        production: 0.394,
        sandbox: 0.2955
      },
      "jp-tokyo": {
        production: 0.394,
        sandbox: 0.2955
      },
      "pl-warsaw": {
        production: 0.394,
        sandbox: 0.2955
      },
      "es-madrid": {
        production: 0.394,
        sandbox: 0.2955
      },
      "kr-seoul": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-miami": {
        production: 0.394,
        sandbox: 0.2955
      },
      "sg-singapore": {
        production: 0.394,
        sandbox: 0.2955
      },
      "se-stockholm": {
        production: 0.394,
        sandbox: 0.2955
      },
      "mx-mexico-city": {
        production: 0.394,
        sandbox: 0.2955
      },
      "br-s-o-paulo": {
        production: 0.592,
        sandbox: 0.444
      },
      "au-melbourne": {
        production: 0.394,
        sandbox: 0.2955
      },
      "us-honolulu": {
        production: 0.394,
        sandbox: 0.2955
      },
      "in-mumbai": {
        production: 0.394,
        sandbox: 0.2955
      },
      "za-johannesburg": {
        production: 0.394,
        sandbox: 0.2955
      },
      "il-tel-aviv": {
        production: 0.394,
        sandbox: 0.2955
      },
      "in-bangalore": {
        production: 0.394,
        sandbox: 0.2955
      },
      "in-delhi-ncr": {
        production: 0.394,
        sandbox: 0.2955
      },
      "cl-santiago": {
        production: 0.394,
        sandbox: 0.2955
      },
      "jp-osaka": {
        production: 0.394,
        sandbox: 0.2955
      },
      "gb-manchester": {
        production: 0.394,
        sandbox: 0.2955
      }
    }
  }
]
export const hostingSystems = [
  { id: "standard", name: "Standard", description: "Shared Intel CPU / SSD" },
  { id: "high-frequency", name: "High Frequency", description: "Shared Intel CPU / NVMe" },
  { id: "performance-amd", name: "High Performance AMD", description: "Shared AMD CPU / NVMe" },
  { id: "performance-intel", name: "High Performance Intel", description: "Shared Intel CPU / NVMe" }
]
