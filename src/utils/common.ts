import axios from "axios";

interface CheckUserData {
  firstName: string;
  lastName: string;
  identityNumber: string;
  yearOfBirth: number;
}

interface IdentityCheckResponse {
  succeded: boolean;
  message: string;
  item?: [] | null;
}

/**
 * Turkish ID verification service URL
 */
const TCKIMLIK_SERVICE_URL =
  "https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx";

/**
 * HTTP client for identity verification requests
 */
const httpClient = axios.create({
  timeout: 30000,
  headers: {
    "Content-Type": "text/xml; charset=utf-8",
    SOAPAction: "http://tckimlik.nvi.gov.tr/WS/TCKimlikNoDogrula",
  },
});

/**
 * Checks if the provided user identity information is valid using Turkish ID verification service
 * @param checkUser - User data to verify
 * @returns Promise<IdentityCheckResponse> - Verification result with success status and message
 */
export async function checkIdentityNumber(
  checkUser: CheckUserData,
): Promise<IdentityCheckResponse> {
  try {
    const soapRequest = createIdentityCheckSoapRequest(checkUser);

    const response = await httpClient.post(TCKIMLIK_SERVICE_URL, soapRequest);

    if (response.status !== 200) {
      return {
        succeded: false,
        message: "Error checking identity number - Service unavailable",
      };
    }

    const isVerified = parseIdentityCheckResponse(response.data);

    if (!isVerified) {
      return {
        succeded: false,
        message:
          "Identity verification failed - Information does not match official records",
      };
    }

    return {
      succeded: true,
      message: "Identity number verified successfully",
    };
  } catch (error) {
    console.error("Error checking identity number:", error);

    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        return {
          succeded: false,
          message: "Identity verification timeout - Please try again",
        };
      }
      if (error.response) {
        return {
          succeded: false,
          message: `Identity verification service error: ${error.response.status}`,
        };
      }
      if (error.request) {
        return {
          succeded: false,
          message:
            "Network error - Could not reach identity verification service",
        };
      }
    }

    return {
      succeded: false,
      message: "Unexpected error during identity verification",
    };
  }
}

/**
 * Creates SOAP request XML for Turkish ID verification
 * @param checkUser - User data to include in the request
 * @returns string - SOAP XML request
 */
function createIdentityCheckSoapRequest(checkUser: CheckUserData): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                 xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                 xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <TCKimlikNoDogrula xmlns="http://tckimlik.nvi.gov.tr/WS">
      <TCKimlikNo>${checkUser.identityNumber}</TCKimlikNo>
      <Ad>${checkUser.firstName}</Ad>
      <Soyad>${checkUser.lastName}</Soyad>
      <DogumYili>${checkUser.yearOfBirth}</DogumYili>
    </TCKimlikNoDogrula>
  </soap12:Body>
</soap12:Envelope>`;
}

/**
 * Parses the SOAP response from the Turkish ID verification service
 * @param responseXml - XML response from the service
 * @returns boolean - true if identity is verified, false otherwise
 */
function parseIdentityCheckResponse(responseXml: string): boolean {
  try {
    // Simple regex matching like the C# version
    const resultMatch = responseXml.match(
      /<TCKimlikNoDogrulaResult>([^<]+)<\/TCKimlikNoDogrulaResult>/i,
    );

    if (resultMatch && resultMatch[1]) {
      return resultMatch[1].toLowerCase().trim() === "true";
    }

    // Alternative namespace patterns
    const altMatch = responseXml.match(
      /<ws:TCKimlikNoDogrulaResult[^>]*>([^<]+)<\/ws:TCKimlikNoDogrulaResult>/i,
    );

    if (altMatch && altMatch[1]) {
      return altMatch[1].toLowerCase().trim() === "true";
    }

    return false;
  } catch (error) {
    console.error("Error parsing identity check response:", error);
    return false;
  }
}

/**
 * Validates Turkish identity number format (basic validation)
 * @param identityNumber - Identity number to validate
 * @returns boolean - true if format is valid
 */
export function validateTurkishIdFormat(identityNumber: string): boolean {
  if (!identityNumber || identityNumber.length !== 11) {
    return false;
  }

  // Check if all characters are digits
  if (!/^\d{11}$/.test(identityNumber)) {
    return false;
  }

  // First digit cannot be 0
  if (identityNumber[0] === "0") {
    return false;
  }

  // Turkish ID algorithm validation
  const digits = identityNumber.split("").map(Number);

  // Sum of first 10 digits
  const sum10 = digits.slice(0, 10).reduce((sum, digit) => sum + digit, 0);

  // 11th digit should be sum10 % 10
  if (digits[10] !== sum10 % 10) {
    return false;
  }

  // Additional validation: sum of odd positions - sum of even positions
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];

  const checkDigit = (oddSum * 7 - evenSum) % 10;

  if (digits[9] !== checkDigit) {
    return false;
  }

  return true;
}

/**
 * Interface for user registration data validation
 */
export interface UserValidationData {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  identityNumber?: string;
  yearOfBirth: number;
}

/**
 * Validates user registration data format
 * @param userData - User data to validate
 * @returns object with validation results
 */
export function validateUserData(userData: UserValidationData) {
  const errors: string[] = [];

  // Name validation
  if (!userData.firstName || userData.firstName.trim().length < 2) {
    errors.push("First name must be at least 2 characters");
  }

  if (!userData.lastName || userData.lastName.trim().length < 2) {
    errors.push("Last name must be at least 2 characters");
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!userData.email || !emailRegex.test(userData.email)) {
    errors.push("Valid email address is required");
  }

  // Phone validation (basic Turkish format)
  const phoneRegex = /^\+?90?[0-9]{10}$/;
  if (
    !userData.phoneNumber ||
    !phoneRegex.test(userData.phoneNumber.replace(/\s/g, ""))
  ) {
    errors.push("Valid Turkish phone number is required");
  }

  // Age validation (minimum 13 years old)
  const currentYear = new Date().getFullYear();
  const age = currentYear - userData.yearOfBirth;
  if (age < 13 || age > 120) {
    errors.push("Age must be between 13 and 120 years");
  }

  // Identity number validation (if provided)
  if (userData.identityNumber) {
    if (!validateTurkishIdFormat(userData.identityNumber)) {
      errors.push("Invalid Turkish identity number format");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
