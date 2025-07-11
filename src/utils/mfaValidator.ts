// MFA Code Validator for Coinbase
export interface MfaValidationResult {
  isValid: boolean;
  error?: string;
  suggestions?: string[];
}

export function validateCoinbaseMfaCode(code: string): MfaValidationResult {
  const cleanCode = code.trim();
  
  // Check if empty
  if (!cleanCode) {
    return {
      isValid: false,
      error: 'Código MFA vacío',
      suggestions: ['Ingresa un código de 6 dígitos de Coinbase']
    };
  }
  
  // Check if not numeric
  if (!/^\d+$/.test(cleanCode)) {
    return {
      isValid: false,
      error: 'Código MFA contiene caracteres no numéricos',
      suggestions: ['Usa solo números (0-9)', 'Copia el código directamente de Coinbase']
    };
  }
  
  // Check length - most common error
  if (cleanCode.length !== 6) {
    const suggestions = [];
    
    if (cleanCode.length === 7) {
      suggestions.push('🚨 PROBLEMA DETECTADO: Códigos de 7 dígitos no funcionan');
      suggestions.push('✅ SOLUCIÓN: Usa códigos de 6 dígitos de Coinbase');
      suggestions.push('📱 FUENTE: App oficial de Coinbase (no SMS)');
    } else if (cleanCode.length < 6) {
      suggestions.push('Código muy corto - Coinbase usa 6 dígitos');
    } else {
      suggestions.push('Código muy largo - Coinbase usa 6 dígitos');
    }
    
    return {
      isValid: false,
      error: `Código MFA debe tener 6 dígitos (tienes ${cleanCode.length})`,
      suggestions
    };
  }
  
  // All checks passed
  return {
    isValid: true
  };
}

// Helper function to format MFA codes for display
export function formatMfaCode(code: string): string {
  const cleanCode = code.trim();
  if (cleanCode.length === 6) {
    return `${cleanCode.slice(0, 3)} ${cleanCode.slice(3)}`;
  }
  return cleanCode;
}

// Helper function to analyze MFA error responses
export function analyzeMfaError(error: any): string {
  const errorMsg = error?.message || error?.displayMessage || '';
  
  if (errorMsg.includes('Two factor') || errorMsg.includes('twoFaFailed')) {
    return '🚨 CÓDIGO MFA INCORRECTO:\n\n' +
           '❌ Problema: Códigos de 7 dígitos no funcionan\n' +
           '✅ Solución: Usa códigos de 6 dígitos de Coinbase\n' +
           '📱 Fuente: App oficial de Coinbase (no SMS)\n' +
           '⚡ Velocidad: Úsalo inmediatamente (menos de 10 segundos)';
  }
  
  return errorMsg;
} 