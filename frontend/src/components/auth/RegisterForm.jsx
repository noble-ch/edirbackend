import { useState } from 'react';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../../services/authService';
import SignatureCanvas from 'react-signature-canvas';

import {
  User, Lock, Mail, Phone, Home, MapPin, Calendar, 
  ChevronLeft, ChevronRight, Check, Info, Plus, X,
  Users, Heart, FileSignature, ClipboardList
} from 'lucide-react';

export const RegisterForm = ({ edirslug }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [userData, setUserData] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone_number: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    home_or_alternate_phone: '',
    registration_type: 'single',
    spouse: {
      full_name: '',
      email: '',
      phone_number: '',
    },
    family_members: [],
    representatives: [],
    signature: '',
    agreed_to_terms: false
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const sigCanvas = useRef(null);
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);

  const clearSignature = () => {
    sigCanvas.current.clear();
    setUserData(prev => ({ ...prev, signature: '' }));
    setIsSignatureEmpty(true);
  };

  const handleSignatureEnd = () => {
    if (sigCanvas.current.isEmpty()) {
      setIsSignatureEmpty(true);
      setUserData(prev => ({ ...prev, signature: '' }));
    } else {
      setIsSignatureEmpty(false);
      setUserData(prev => ({ ...prev, signature: sigCanvas.current.toDataURL() }));
    }
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => {
      const newData = { ...prev, [name]: value };
      if (name === 'registration_type' && value === 'single') {
        newData.spouse = { full_name: '', email: '', phone_number: '' };
        newData.family_members = [];
      }
      return newData;
    });
  };

  const handleSpouseChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      spouse: {
        ...prev.spouse,
        [name]: value,
      },
    }));
  };

  const handleFamilyMemberChange = (index, e) => {
    const { name, value } = e.target;
    const updatedFamilyMembers = [...userData.family_members];
    updatedFamilyMembers[index] = {
      ...updatedFamilyMembers[index],
      [name]: value,
    };
    setUserData(prev => ({ ...prev, family_members: updatedFamilyMembers }));
  };

  const addFamilyMember = () => {
    setUserData(prev => ({
      ...prev,
      family_members: [
        ...prev.family_members,
        { full_name: '', gender: 'male', date_of_birth: '', relationship: '' },
      ],
    }));
  };

  const removeFamilyMember = (index) => {
    setUserData(prev => ({
      ...prev,
      family_members: prev.family_members.filter((_, i) => i !== index),
    }));
  };

  const handleRepresentativeChange = (index, e) => {
    const { name, value } = e.target;
    const updatedRepresentatives = [...userData.representatives];
    updatedRepresentatives[index] = {
      ...updatedRepresentatives[index],
      [name]: value,
    };
    setUserData(prev => ({ ...prev, representatives: updatedRepresentatives }));
  };

  const addRepresentative = () => {
    setUserData(prev => ({
      ...prev,
      representatives: [
        ...prev.representatives,
        { full_name: '', phone_number: '', email: '', date_of_designation: '' },
      ],
    }));
  };

  const removeRepresentative = (index) => {
    setUserData(prev => ({
      ...prev,
      representatives: prev.representatives.filter((_, i) => i !== index),
    }));
  };

  // const handleSignatureChange = (e) => { // This function seems unused as signature is handled by SignatureCanvas
  //   setUserData(prev => ({ ...prev, signature: e.target.value }));
  // };

  const handleTermsChange = (e) => {
    setUserData(prev => ({ ...prev, agreed_to_terms: e.target.checked }));
  };

  const nextStep = () => {
    if (currentStep === 3 && userData.registration_type === 'single') {
      setCurrentStep(5); // Skip step 4 (Family Members)
    } else if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep === 5 && userData.registration_type === 'single') {
      setCurrentStep(3); // Skip step 4 (Family Members) when going back
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userData.agreed_to_terms) {
      setError('You must agree to the terms and conditions');
      return;
    }
     if (isSignatureEmpty) {
      setError('Please provide your signature.');
      return;
    }
    
    setIsLoading(true);
    setError('');

    const { 
      spouse, 
      family_members: currentFamilyMembers,
      representatives: currentRepresentatives,
      registration_type: currentRegistrationType,
      ...otherUserData
    } = userData;

    const payload = {
      ...otherUserData,
      registration_type: currentRegistrationType,
      representatives: currentRepresentatives.map(rep => ({
        ...rep,
        date_of_designation: rep.date_of_designation || new Date().toISOString().split('T')[0]
      })),
      family_members: currentFamilyMembers.map(member => ({
        ...member,
        date_of_birth: member.date_of_birth || new Date().toISOString().split('T')[0]
      }))
    };

    if (currentRegistrationType === 'family' && 
        spouse && 
        spouse.full_name && 
        spouse.full_name.trim() !== '') {
      payload.spouse = spouse; 
    }

    try {
      await register(edirslug, payload);
      navigate(`/${edirslug}/login`);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const FieldTooltip = ({ info }) => (
    <span className="group relative inline-block ml-2">
      <Info size={16} className="text-gray-400 hover:text-gray-600 cursor-pointer" />
      <span className="absolute z-10 hidden group-hover:block w-64 p-2 text-xs bg-gray-800 text-white rounded shadow-lg -left-32 -top-8">
        {info}
      </span>
    </span>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Account Information
        return (
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label htmlFor="username" className="flex items-center text-sm font-medium text-gray-700">
                <User className="mr-2 h-4 w-4" /> Username
                <FieldTooltip info="Choose a unique username for your account" />
              </label>
              <input type="text" id="username" name="username" value={userData.username} onChange={handleChange} required 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
            </div>
            <div>
              <label htmlFor="password" className="flex items-center text-sm font-medium text-gray-700">
                <Lock className="mr-2 h-4 w-4" /> Password
                <FieldTooltip info="Minimum 8 characters with at least one number and one special character" />
              </label>
              <input type="password" id="password" name="password" value={userData.password} onChange={handleChange} required 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="full_name" className="flex items-center text-sm font-medium text-gray-700">
                <User className="mr-2 h-4 w-4" /> Full Name
              </label>
              <input type="text" id="full_name" name="full_name" value={userData.full_name} onChange={handleChange} required 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="email" className="flex items-center text-sm font-medium text-gray-700">
                <Mail className="mr-2 h-4 w-4" /> Email
                <FieldTooltip info="We'll send a confirmation email to this address" />
              </label>
              <input type="email" id="email" name="email" value={userData.email} onChange={handleChange} required 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
            </div>
          </div>
        );
      case 2: // Contact Information
        return (
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
            <div>
              <label htmlFor="phone_number" className="flex items-center text-sm font-medium text-gray-700">
                <Phone className="mr-2 h-4 w-4" /> Phone Number
              </label>
              <input type="tel" id="phone_number" name="phone_number" value={userData.phone_number} onChange={handleChange} required 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
            </div>
            <div>
              <label htmlFor="home_or_alternate_phone" className="flex items-center text-sm font-medium text-gray-700">
                <Phone className="mr-2 h-4 w-4" /> Alternate Phone
              </label>
              <input type="tel" id="home_or_alternate_phone" name="home_or_alternate_phone" value={userData.home_or_alternate_phone} onChange={handleChange} 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="address" className="flex items-center text-sm font-medium text-gray-700">
                <Home className="mr-2 h-4 w-4" /> Address
              </label>
              <input type="text" id="address" name="address" value={userData.address} onChange={handleChange} required 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
            </div>
            <div>
              <label htmlFor="city" className="flex items-center text-sm font-medium text-gray-700">
                <MapPin className="mr-2 h-4 w-4" /> City
              </label>
              <input type="text" id="city" name="city" value={userData.city} onChange={handleChange} required 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
            </div>
            <div>
              <label htmlFor="state" className="flex items-center text-sm font-medium text-gray-700">
                <MapPin className="mr-2 h-4 w-4" /> State/Region
              </label>
              <input type="text" id="state" name="state" value={userData.state} onChange={handleChange} required 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
            </div>
            <div>
              <label htmlFor="zip_code" className="flex items-center text-sm font-medium text-gray-700">
                <MapPin className="mr-2 h-4 w-4" /> ZIP Code
              </label>
              <input type="text" id="zip_code" name="zip_code" value={userData.zip_code} onChange={handleChange} required 
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
            </div>
          </div>
        );
      case 3: // Registration Type & Spouse
        return (
          <>
            <div>
              <label htmlFor="registration_type" className="flex items-center text-sm font-medium text-gray-700">
                <Users className="mr-2 h-4 w-4" /> Registration Type
                <FieldTooltip info="Choose 'Single' for individual registration or 'Family' to include spouse and dependents" />
              </label>
              <select id="registration_type" name="registration_type" value={userData.registration_type} onChange={handleChange} 
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)] sm:text-sm rounded-md">
                <option value="single">Single</option>
                <option value="family">Family</option>
              </select>
            </div>
            {userData.registration_type === 'family' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="flex items-center text-lg font-medium leading-6 text-gray-900">
                  <Heart className="mr-2 h-5 w-5" /> Spouse Information
                </h3>
                <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor="spouse_full_name" className="flex items-center text-sm font-medium text-gray-700">
                      Spouse Full Name
                    </label>
                    <input type="text" id="spouse_full_name" name="full_name" value={userData.spouse.full_name} onChange={handleSpouseChange} required 
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
                  </div>
                  <div>
                    <label htmlFor="spouse_email" className="flex items-center text-sm font-medium text-gray-700">
                      <Mail className="mr-2 h-4 w-4" /> Spouse Email
                    </label>
                    <input type="email" id="spouse_email" name="email" value={userData.spouse.email} onChange={handleSpouseChange} 
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
                  </div>
                  <div>
                    <label htmlFor="spouse_phone_number" className="flex items-center text-sm font-medium text-gray-700">
                      <Phone className="mr-2 h-4 w-4" /> Spouse Phone
                    </label>
                    <input type="tel" id="spouse_phone_number" name="phone_number" value={userData.spouse.phone_number} onChange={handleSpouseChange} 
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
                  </div>
                </div>
              </div>
            )}
          </>
        );
      case 4: // Family Members
        if (userData.registration_type !== 'family') return null;
        return (
          <>
            <h3 className="flex items-center text-lg font-medium leading-6 text-gray-900">
              <Users className="mr-2 h-5 w-5" /> Family Members
              <FieldTooltip info="Add all family members who will be covered under this registration" />
            </h3>
            {userData.family_members.length === 0 && (
              <div className="mt-4 text-center text-gray-500 py-6 border-2 border-dashed border-gray-300 rounded-lg">
                <p>No family members added yet</p>
                <button type="button" onClick={addFamilyMember} className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--pigment-green)]">
                  <Plus className="mr-1 h-4 w-4" /> Add First Member
                </button>
              </div>
            )}
            {userData.family_members.map((member, index) => (
              <div key={index} className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="flex items-center text-md font-medium text-gray-800">
                    <User className="mr-2 h-4 w-4" /> Family Member {index + 1}
                  </h4>
                  <button type="button" onClick={() => removeFamilyMember(index)} className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-500">
                    <X className="mr-1 h-4 w-4" /> Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor={`fm_full_name_${index}`} className="text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" id={`fm_full_name_${index}`} name="full_name" value={member.full_name} onChange={(e) => handleFamilyMemberChange(index, e)} required 
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
                  </div>
                  <div>
                    <label htmlFor={`fm_gender_${index}`} className="text-sm font-medium text-gray-700">Gender</label>
                    <select id={`fm_gender_${index}`} name="gender" value={member.gender} onChange={(e) => handleFamilyMemberChange(index, e)} 
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)] sm:text-sm rounded-md">
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`fm_dob_${index}`} className="flex items-center text-sm font-medium text-gray-700">
                      <Calendar className="mr-2 h-4 w-4" /> Date of Birth
                    </label>
                    <input type="date" id={`fm_dob_${index}`} name="date_of_birth" value={member.date_of_birth} onChange={(e) => handleFamilyMemberChange(index, e)} required 
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`fm_relationship_${index}`} className="text-sm font-medium text-gray-700">Relationship</label>
                    <input type="text" id={`fm_relationship_${index}`} name="relationship" value={member.relationship} onChange={(e) => handleFamilyMemberChange(index, e)} required 
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
                  </div>
                </div>
              </div>
            ))}
            {userData.family_members.length > 0 && (
              <button type="button" onClick={addFamilyMember} className="mt-4 w-full flex justify-center items-center py-2 px-4 border border-dashed border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Plus className="mr-2 h-4 w-4" /> Add Another Family Member
              </button>
            )}
          </>
        );
      case 5: // Representatives
        return (
          <>
            <h3 className="flex items-center text-lg font-medium leading-6 text-gray-900">
              <User className="mr-2 h-5 w-5" /> Representatives
              <FieldTooltip info="Add people who can represent you in case you're unavailable" />
            </h3>
            {userData.representatives.length === 0 && (
              <div className="mt-4 text-center text-gray-500 py-6 border-2 border-dashed border-gray-300 rounded-lg">
                <p>No representatives added yet</p>
                <button type="button" onClick={addRepresentative} className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--pigment-green)]">
                  <Plus className="mr-1 h-4 w-4" /> Add First Representative
                </button>
              </div>
            )}
            {userData.representatives.map((rep, index) => (
              <div key={index} className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="flex items-center text-md font-medium text-gray-800">
                    <User className="mr-2 h-4 w-4" /> Representative {index + 1}
                  </h4>
                  <button type="button" onClick={() => removeRepresentative(index)} className="inline-flex items-center text-sm font-medium text-red-600 hover:text-red-500">
                    <X className="mr-1 h-4 w-4" /> Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label htmlFor={`rep_full_name_${index}`} className="text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" id={`rep_full_name_${index}`} name="full_name" value={rep.full_name} onChange={(e) => handleRepresentativeChange(index, e)} required 
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
                  </div>
                  <div>
                    <label htmlFor={`rep_phone_${index}`} className="flex items-center text-sm font-medium text-gray-700">
                      <Phone className="mr-2 h-4 w-4" /> Phone Number
                    </label>
                    <input type="tel" id={`rep_phone_${index}`} name="phone_number" value={rep.phone_number} onChange={(e) => handleRepresentativeChange(index, e)} required 
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
                  </div>
                  <div>
                    <label htmlFor={`rep_email_${index}`} className="flex items-center text-sm font-medium text-gray-700">
                      <Mail className="mr-2 h-4 w-4" /> Email
                    </label>
                    <input type="email" id={`rep_email_${index}`} name="email" value={rep.email} onChange={(e) => handleRepresentativeChange(index, e)} 
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor={`rep_dod_${index}`} className="flex items-center text-sm font-medium text-gray-700">
                      <Calendar className="mr-2 h-4 w-4" /> Date of Designation
                    </label>
                    <input type="date" id={`rep_dod_${index}`} name="date_of_designation" value={rep.date_of_designation} onChange={(e) => handleRepresentativeChange(index, e)} required 
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--pigment-green)] focus:border-[var(--pigment-green)]" />
                  </div>
                </div>
              </div>
            ))}
            {userData.representatives.length > 0 && (
              <button type="button" onClick={addRepresentative} className="mt-4 w-full flex justify-center items-center py-2 px-4 border border-dashed border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                <Plus className="mr-2 h-4 w-4" /> Add Another Representative
              </button>
            )}
          </>
        );
      case 6: // Review and Signature
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="flex items-center text-lg font-medium text-gray-900 mb-4">
                <ClipboardList className="mr-2 h-5 w-5" /> Review Your Information
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-md font-medium text-gray-700">Account Information</h4>
                  <div className="mt-2 grid grid-cols-1 gap-y-2 gap-x-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-gray-500">Username</p>
                      <p className="text-sm font-medium">{userData.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="text-sm font-medium">{userData.full_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-sm font-medium">{userData.email}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <h4 className="text-md font-medium text-gray-700">Contact Information</h4>
                  <div className="mt-2 grid grid-cols-1 gap-y-2 gap-x-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="text-sm font-medium">{userData.phone_number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Alternate Phone</p>
                      <p className="text-sm font-medium">{userData.home_or_alternate_phone || 'Not provided'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="text-sm font-medium">
                        {userData.address}, {userData.city}, {userData.state} {userData.zip_code}
                      </p>
                    </div>
                  </div>
                </div>

                {userData.registration_type === 'family' && (
                  <>
                    <div className="pt-4 border-t border-gray-200">
                      <h4 className="text-md font-medium text-gray-700">Spouse Information</h4>
                      <div className="mt-2 grid grid-cols-1 gap-y-2 gap-x-4 sm:grid-cols-2">
                        <div>
                          <p className="text-sm text-gray-500">Name</p>
                          <p className="text-sm font-medium">{userData.spouse.full_name || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="text-sm font-medium">{userData.spouse.email || 'Not provided'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="text-sm font-medium">{userData.spouse.phone_number || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>

                    {userData.family_members.length > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <h4 className="text-md font-medium text-gray-700">Family Members</h4>
                        <div className="mt-2 space-y-3">
                          {userData.family_members.map((member, index) => (
                            <div key={index} className="grid grid-cols-1 gap-y-2 gap-x-4 sm:grid-cols-4">
                              <div>
                                <p className="text-sm text-gray-500">Name</p>
                                <p className="text-sm font-medium">{member.full_name}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Gender</p>
                                <p className="text-sm font-medium">{member.gender}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Date of Birth</p>
                                <p className="text-sm font-medium">{member.date_of_birth}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Relationship</p>
                                <p className="text-sm font-medium">{member.relationship}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {userData.representatives.length > 0 && (
                  <div className="pt-4 border-t border-gray-200">
                    <h4 className="text-md font-medium text-gray-700">Representatives</h4>
                    <div className="mt-2 space-y-3">
                      {userData.representatives.map((rep, index) => (
                        <div key={index} className="grid grid-cols-1 gap-y-2 gap-x-4 sm:grid-cols-3">
                          <div>
                            <p className="text-sm text-gray-500">Name</p>
                            <p className="text-sm font-medium">{rep.full_name}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Phone</p>
                            <p className="text-sm font-medium">{rep.phone_number}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Date of Designation</p>
                            <p className="text-sm font-medium">{rep.date_of_designation}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
    <div className="pt-4 border-t border-gray-200">
          <h3 className="flex items-center text-lg font-medium text-gray-900 mb-4">
            <FileSignature className="mr-2 h-5 w-5" /> Signature & Agreement
          </h3>
          
          <div className="mt-4 bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 mb-4">
              I, <span className="font-semibold">{userData.full_name}</span>, hereby apply to become a member of the 
              <span className="font-semibold"> {edirslug}</span> and agree to fully adhere and abide by the rules
              and obligations of the by-laws of the EDIR as stated therein. I also certify that the information 
              provided in this form is true and correct.
            </p>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Signature
              </label>
              <div className="border border-gray-300 rounded-md p-2 bg-white">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor="black"
                  canvasProps={{
                    width: 500,
                    height: 200,
                    className: 'signature-canvas w-full h-48 bg-white border border-gray-200 rounded'
                  }}
                  onEnd={handleSignatureEnd}
                />
              </div>
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={clearSignature}
                  className="text-sm text-red-600 hover:text-red-500"
                >
                  Clear Signature
                </button>
              </div>
            </div>
            
            <div className="mt-6 flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="agreed_to_terms"
                  name="agreed_to_terms"
                  type="checkbox"
                  checked={userData.agreed_to_terms}
                  onChange={handleTermsChange}
                  className="focus:ring-[var(--pigment-green)] h-4 w-4 text-[var(--pigment-green)] border-gray-300 rounded"
                  required
                />
              </div>
              <div className="ml-3 text-sm">
                <label htmlFor="agreed_to_terms" className="font-medium text-gray-700">
                  I agree to the terms and conditions
                </label>
                <p className="text-gray-500">
                  By checking this box, you confirm that all information provided is accurate and agree to our terms of service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
      default:
        return null;
    }
  };

  const getStepTitle = (step) => {
    const titles = {
      1: "Account Information",
      2: "Contact Details",
      3: "Family Status",
      4: "Family Members",
      5: "Representatives",
      6: "Review & Signature"
    };
    return titles[step] || "Registration";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900">Register for {edirslug}</h1>
          <p className="mt-2 text-sm text-gray-600">Complete the form below to join our community</p>
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Progress bar */}
          <div className="px-4 pt-4 sm:px-6">
            <div className="mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Step {currentStep} of 6: {getStepTitle(currentStep)}
              </h2>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-[var(--pigment-green)] h-2.5 rounded-full" 
                  style={{ width: `${(currentStep / 6) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 px-4 py-5 sm:p-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {renderStepContent()}

            <div className="pt-5">
              <div className="flex justify-between">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--pigment-green)]"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                  </button>
                ) : (
                  <div />
                )}

                {currentStep < 6 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--pigment-green)] hover:bg-[var(--brunswick-green)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--pigment-green)]"
                  >
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading || isSignatureEmpty || !userData.agreed_to_terms}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[var(--pigment-green)] hover:bg-[var(--brunswick-green)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--pigment-green)] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Complete Registration
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};