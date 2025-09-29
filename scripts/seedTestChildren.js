// scripts/seedTestChildren.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('../src/config/database');
const Child = require('../src/models/Child');

const createTestChildren = async () => {
  try {
    await connectDB();
    
    // Check if children already exist
    const existingChildren = await Child.countDocuments();
    
    if (existingChildren > 0) {
      console.log(`⚠️  ${existingChildren} children already exist in database!`);
      process.exit(0);
    }
    
    // Create test children data
    const testChildren = [
      {
        child_id: 'TH-2024-001',
        first_name: 'Sarah',
        middle_name: 'Adunni',
        last_name: 'Adebayo',
        date_of_birth: new Date('2015-03-15'),
        gender: 'Female',
        admission_date: new Date('2024-01-15'),
        current_status: 'Active',
        state_of_origin: 'Lagos',
        lga: 'Ikeja',
        nationality: 'Nigerian',
        preferred_language: 'Yoruba',
        religion: 'Christianity',
        tribal_marks: 'Small tribal marks on both cheeks',
        education_level: 'Primary 4',
        school_name: 'St. Mary\'s Primary School',
        ambition: 'Doctor',
        health_status: 'Good',
        genotype: 'AA',
        blood_type: 'O+',
        height_cm: 120,
        weight_kg: 25,
        allergies: ['Peanuts', 'Shellfish'],
        medical_conditions: [{
          condition: 'Mild asthma',
          diagnosed_date: new Date('2023-01-15'),
          current_treatment: 'Controlled with inhaler',
          notes: 'Well managed, no recent episodes'
        }],
        immunization_status: 'Up to date',
        legal_guardian_name: 'Mrs. Kemi Adebayo',
        legal_guardian_contact: '+234 803 123 4567',
        next_of_kin_name: 'Mr. Tunde Adebayo',
        next_of_kin_contact: '+234 805 987 6543',
        emergency_contact: '+234 803 123 4567',
        birth_certificate_number: 'BC/LAG/2015/123456',
        government_registration_number: 'GRN/TH/2024/001',
        court_case_number: 'CC/FCT/2024/789',
        arrival_circumstances: 'Sarah was brought to Tabitha Home after her parents were involved in a car accident. Her aunt, who was caring for her, was unable to continue due to financial constraints.',
        case_worker: 'Dr. Amina Hassan',
        social_worker_notes: 'Sarah is a bright and cheerful child who has adapted well to life at Tabitha Home. She shows strong academic potential and gets along well with other children.',
        room_assignment: 'Room 12A',
        bed_number: 'Bed 3',
        monthly_allowance: 5000,
        chores_assigned: 'Cleaning, Library duty',
        mentorship_program: 'Yes - Paired with Mrs. Folake',
        behavioral_assessment_score: 8.5,
        psychological_evaluation_date: new Date('2024-05-01'),
        last_family_contact_date: new Date('2024-06-15'),
        last_checkup: new Date('2024-05-15'),
        created_by: '685d6dc1d0bbe54d29e4136a', // Super admin ID
        last_modified_by: '685d6dc1d0bbe54d29e4136a'
      },
      {
        child_id: 'TH-2024-002',
        first_name: 'Ahmed',
        middle_name: 'Ibrahim',
        last_name: 'Mohammed',
        date_of_birth: new Date('2012-07-22'),
        gender: 'Male',
        admission_date: new Date('2024-02-10'),
        current_status: 'Active',
        state_of_origin: 'Kano',
        lga: 'Kano Municipal',
        nationality: 'Nigerian',
        preferred_language: 'Hausa',
        religion: 'Islam',
        tribal_marks: 'None',
        education_level: 'Primary 6',
        school_name: 'Al-Noor Islamic School',
        ambition: 'Engineer',
        health_status: 'Excellent',
        genotype: 'AS',
        blood_type: 'A+',
        height_cm: 135,
        weight_kg: 32,
        allergies: [],
        medical_conditions: [],
        immunization_status: 'Up to date',
        legal_guardian_name: 'Alhaji Ibrahim Mohammed',
        legal_guardian_contact: '+234 802 456 7890',
        next_of_kin_name: 'Hajiya Fatima Mohammed',
        next_of_kin_contact: '+234 803 456 7890',
        emergency_contact: '+234 802 456 7890',
        birth_certificate_number: 'BC/KAN/2012/789012',
        government_registration_number: 'GRN/TH/2024/002',
        court_case_number: 'CC/KAN/2024/456',
        arrival_circumstances: 'Ahmed was found wandering the streets of Kano after his family was displaced by communal violence. He was brought to Tabitha Home by social services.',
        case_worker: 'Mr. Yusuf Abdullahi',
        social_worker_notes: 'Ahmed is a quiet but intelligent boy who excels in mathematics. He is learning to trust adults again and has made good progress.',
        room_assignment: 'Room 8B',
        bed_number: 'Bed 1',
        monthly_allowance: 5000,
        chores_assigned: 'Garden maintenance, Kitchen help',
        mentorship_program: 'Yes - Paired with Mr. Hassan',
        behavioral_assessment_score: 7.8,
        psychological_evaluation_date: new Date('2024-03-15'),
        last_family_contact_date: new Date('2024-05-20'),
        last_checkup: new Date('2024-06-10'),
        created_by: '685d6dc1d0bbe54d29e4136a',
        last_modified_by: '685d6dc1d0bbe54d29e4136a'
      },
      {
        child_id: 'TH-2024-003',
        first_name: 'Blessing',
        middle_name: 'Chinwe',
        last_name: 'Okafor',
        date_of_birth: new Date('2018-11-08'),
        gender: 'Female',
        admission_date: new Date('2024-03-05'),
        current_status: 'Active',
        state_of_origin: 'Anambra',
        lga: 'Awka South',
        nationality: 'Nigerian',
        preferred_language: 'Igbo',
        religion: 'Christianity',
        tribal_marks: 'None',
        education_level: 'Pre-School',
        school_name: 'Little Angels Nursery',
        ambition: 'Teacher',
        health_status: 'Good',
        genotype: 'AA',
        blood_type: 'B+',
        height_cm: 95,
        weight_kg: 18,
        allergies: ['Dust mites'],
        medical_conditions: [],
        immunization_status: 'Up to date',
        legal_guardian_name: 'Mrs. Ngozi Okafor',
        legal_guardian_contact: '+234 805 123 4567',
        next_of_kin_name: 'Mr. Emeka Okafor',
        next_of_kin_contact: '+234 803 123 4567',
        emergency_contact: '+234 805 123 4567',
        birth_certificate_number: 'BC/ANA/2018/345678',
        government_registration_number: 'GRN/TH/2024/003',
        court_case_number: 'CC/ANA/2024/123',
        arrival_circumstances: 'Blessing was abandoned at a local hospital by her mother who was unable to care for her due to financial difficulties. She was referred to Tabitha Home by hospital social services.',
        case_worker: 'Mrs. Chioma Nwosu',
        social_worker_notes: 'Blessing is a sweet and playful child who loves to sing and dance. She has adapted well to the structured environment and enjoys playing with other children.',
        room_assignment: 'Room 5A',
        bed_number: 'Bed 2',
        monthly_allowance: 3000,
        chores_assigned: 'Toy organization, Simple cleaning',
        mentorship_program: 'Yes - Paired with Mrs. Grace',
        behavioral_assessment_score: 9.2,
        psychological_evaluation_date: new Date('2024-04-10'),
        last_family_contact_date: new Date('2024-06-01'),
        last_checkup: new Date('2024-05-20'),
        created_by: '685d6dc1d0bbe54d29e4136a',
        last_modified_by: '685d6dc1d0bbe54d29e4136a'
      }
    ];
    
    // Insert test children
    const createdChildren = await Child.insertMany(testChildren);
    
    console.log('🎉 Test children created successfully!');
    console.log('=====================================');
    console.log(`📊 Created ${createdChildren.length} children:`);
    
    createdChildren.forEach((child, index) => {
      console.log(`${index + 1}. ${child.first_name} ${child.last_name} (${child.child_id})`);
    });
    
    console.log('=====================================');
    console.log('✅ You can now test the frontend with these children!');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating test children:', error);
    process.exit(1);
  }
};

createTestChildren();
