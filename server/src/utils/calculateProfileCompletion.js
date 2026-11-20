export const calculateProfileCompletion = (profile) => {
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
