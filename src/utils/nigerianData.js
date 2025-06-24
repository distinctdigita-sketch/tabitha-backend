// Nigerian states and their LGAs
const NIGERIAN_STATES = {
    'Abia': [
      'Aba North', 'Aba South', 'Arochukwu', 'Bende', 'Ikwuano', 'Isiala Ngwa North',
      'Isiala Ngwa South', 'Isuikwuato', 'Obi Ngwa', 'Ohafia', 'Osisioma', 'Ugwunagbo',
      'Ukwa East', 'Ukwa West', 'Umuahia North', 'Umuahia South', 'Umu Nneochi'
    ],
    'Lagos': [
      'Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry',
      'Epe', 'Eti Osa', 'Ibeju-Lekki', 'Ifako-Ijaiye', 'Ikeja', 'Ikorodu',
      'Kosofe', 'Lagos Island', 'Lagos Mainland', 'Mushin', 'Ojo', 'Oshodi-Isolo',
      'Shomolu', 'Surulere'
    ],
    'Oyo': [
      'Afijio', 'Akinyele', 'Atiba', 'Atisbo', 'Egbeda', 'Ibadan North',
      'Ibadan North-East', 'Ibadan North-West', 'Ibadan South-East', 'Ibadan South-West',
      'Ibarapa Central', 'Ibarapa East', 'Ibarapa North', 'Ido', 'Irepo', 'Iseyin',
      'Itesiwaju', 'Iwajowa', 'Kajola', 'Lagelu', 'Ogbomoso North', 'Ogbomoso South',
      'Ogo Oluwa', 'Olorunsogo', 'Oluyole', 'Ona Ara', 'Orelope', 'Ori Ire',
      'Oyo East', 'Oyo West', 'Saki East', 'Saki West', 'Surulere'
    ],
    // Add more states as needed
  };
  
  // Common Nigerian names for autocomplete
  const COMMON_NIGERIAN_NAMES = {
    first_names: [
      // Yoruba names
      'Adebayo', 'Adebola', 'Adedayo', 'Adesola', 'Adetola', 'Adewale', 'Aisha',
      'Ayoade', 'Ayoola', 'Ayomide', 'Bukola', 'Damilola', 'Femi', 'Funmi',
      'Kemi', 'Lola', 'Ola', 'Olumide', 'Segun', 'Tola', 'Wole', 'Yemi',
      
      // Igbo names
      'Chioma', 'Chinedu', 'Chinelo', 'Chukwu', 'Emeka', 'Ikechukwu', 'Kelechi',
      'Ngozi', 'Nkem', 'Nnamdi', 'Obinna', 'Ogechi', 'Ugochi', 'Uzoma',
      
      // Hausa names
      'Abubakar', 'Ahmad', 'Amina', 'Fatima', 'Hassan', 'Ibrahim', 'Khadija',
      'Maryam', 'Muhammad', 'Mustafa', 'Usman', 'Zahra', 'Zainab',
      
      // English/Christian names
      'Abraham', 'David', 'Esther', 'Faith', 'Grace', 'Joy', 'Mary', 'Peace',
      'Peter', 'Ruth', 'Samuel', 'Sarah'
    ],
    
    last_names: [
      // Yoruba surnames
      'Adebayo', 'Adeyemi', 'Afolabi', 'Agbaje', 'Akande', 'Akinola', 'Alabi',
      'Ayeni', 'Babatunde', 'Falana', 'Odunsi', 'Ogundipe', 'Ogunleye', 'Okafor',
      'Olaniyan', 'Olatunji', 'Oyedepo', 'Salami', 'Taiwo',
      
      // Igbo surnames
      'Achebe', 'Anyanwu', 'Chukwu', 'Ebuka', 'Igwe', 'Nwankwo', 'Nwosu',
      'Okafor', 'Okoro', 'Onwuka', 'Opara', 'Udeze', 'Ugwu',
      
      // Hausa surnames
      'Abdullahi', 'Aliyu', 'Bello', 'Garba', 'Hassan', 'Ibrahim', 'Musa',
      'Sani', 'Umar', 'Yakubu', 'Yusuf'
    ]
  };
  
  // Medical conditions common in Nigeria
  const COMMON_MEDICAL_CONDITIONS = [
    'Malaria', 'Typhoid', 'Sickle Cell Disease', 'Asthma', 'Pneumonia',
    'Diarrhea', 'Skin Infections', 'Eye Infections', 'Ear Infections',
    'Measles', 'Chickenpox', 'Tuberculosis', 'Hepatitis', 'Anemia',
    'Malnutrition', 'Dehydration', 'Fever', 'Cough', 'Cold'
  ];
  
  // Education levels in Nigerian system
  const EDUCATION_LEVELS = [
    'Pre-School', 'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 
    'Primary 5', 'Primary 6', 'JSS 1', 'JSS 2', 'JSS 3', 'SSS 1', 
    'SSS 2', 'SSS 3', 'Tertiary', 'Vocational Training', 'Out of School'
  ];
  
  // Genotype compatibility checker
  const checkGenotypeCompatibility = (genotype1, genotype2) => {
    const riskyPairs = [
      ['AS', 'AS'], ['AS', 'SS'], ['AS', 'SC'], ['AS', 'AC'],
      ['SS', 'AS'], ['SS', 'SS'], ['SS', 'SC'], ['SS', 'AC'],
      ['SC', 'AS'], ['SC', 'SS'], ['SC', 'SC'], ['SC', 'AC'],
      ['AC', 'AS'], ['AC', 'SS'], ['AC', 'SC'], ['AC', 'AC']
    ];
    
    const pair1 = [genotype1, genotype2];
    const pair2 = [genotype2, genotype1];
    
    const isRisky = riskyPairs.some(pair => 
      (pair[0] === pair1[0] && pair[1] === pair1[1]) ||
      (pair[0] === pair2[0] && pair[1] === pair2[1])
    );
    
    return {
      compatible: !isRisky,
      riskLevel: isRisky ? 'High' : 'Low',
      recommendation: isRisky 
        ? 'Genetic counseling recommended before marriage/having children'
        : 'Genotypes are compatible'
    };
  };
  
  // Format Nigerian phone number
  const formatNigerianPhone = (phone) => {
    if (!phone) return '';
    
    // Remove all non-numeric characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('234')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('0')) {
      return `+234${cleaned.substring(1)}`;
    } else if (cleaned.length === 10) {
      return `+234${cleaned}`;
    }
    
    return phone; // Return original if can't format
  };
  
  // Validate Nigerian NIN
  const validateNIN = (nin) => {
    if (!nin) return false;
    return /^\d{11}$/.test(nin);
  };
  
  module.exports = {
    NIGERIAN_STATES,
    COMMON_NIGERIAN_NAMES,
    COMMON_MEDICAL_CONDITIONS,
    EDUCATION_LEVELS,
    checkGenotypeCompatibility,
    formatNigerianPhone,
    validateNIN
  };