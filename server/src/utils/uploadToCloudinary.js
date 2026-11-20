import cloudinary from "../config/cloudinary.js";

const uploadToCloudinary = (
  fileBuffer,
  folder = "dopest-doc/patient-profiles",
) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          {
            width: 500,
            height: 500,
            crop: "limit",
          },
        ],
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result);
      },
    );

    uploadStream.end(fileBuffer);
  });
};

export default uploadToCloudinary;
