export const calculatePatientProfileCompletion = (profile) => {
  const requiredFields = [
    profile.dateOfBirth,
    profile.gender,
    profile.address?.city,
    profile.address?.county,
    profile.emergencyContact?.name,
    profile.emergencyContact?.relationship,
    profile.emergencyContact?.phone,
  ];

  const completedFields = requiredFields.filter((field) => {
    return field !== null && field !== undefined && String(field).trim() !== "";
  });

  return completedFields.length === requiredFields.length;
};

export const calculateDoctorProfileCompletion = (profile) => {
  return Boolean(
    profile.specialization &&
    profile.qualifications.length > 0 &&
    profile.licenseNumber &&
    profile.yearsOfExperience !== undefined,
  );
};
