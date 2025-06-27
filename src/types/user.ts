export type User = {
  id: string;
  restaurantId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  title: string;
  email: string;
  yearOfBirth: number;
  status: string;
  imageUrl: string;
  isNewUser: boolean;
  phoneVerification: boolean;
  confirmationStatus: string;
  lastLoginDate: Date;
  permissionNames: string[];
  roles: Role[];
};

export type Role = {
  id: string;
  name: string;
  description: string;
  status: string;
  restaurantId: string;
  permissions: Permission[];
};

export type Permission = {
  id: string;
  name: string;
  description: string;
};
