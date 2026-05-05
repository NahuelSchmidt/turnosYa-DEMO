
"use client";

import { useState, useEffect } from 'react';

const SESSION_STORAGE_KEY = 'turnosya_auth_session';

export interface User {
    email: string;
    password: string; // In a real app, this should be hashed
    tenantId: string;
    phone: string; // Phone number for the business
    businessName: string;
}

// Lista de administradores predefinidos
export const adminUsers: User[] = [
    {
        email: 'admin@turnosya.com',
        password: 'admin123',
        tenantId: 'admin-tenant-1',
        phone: '5491112345678', // Example phone
        businessName: 'Peluquería de Admin 1'
    },
    {
        email: 'otro@negocio.com',
        password: 'otro-password',
        tenantId: 'admin-tenant-2',
        phone: '5491187654321', // Example phone
        businessName: 'Barbería de Admin 2'
    }
];

interface AuthResult {
    success: boolean;
    message: string;
}

export function useAuth() {
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    // Check for an active session when the hook mounts
    const session = localStorage.getItem(SESSION_STORAGE_KEY);
    if (session) {
      // Validate that the session belongs to a valid admin
      if (adminUsers.some(u => u.tenantId === session)) {
        setTenantId(session);
      } else {
        // Clear invalid session
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }
  }, []);

  const login = (email: string, password: string): AuthResult => {
    if (!email || !password) {
        return { success: false, message: "Email y contraseña son obligatorios." };
    }

    const foundUser = adminUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!foundUser) {
        return { success: false, message: "El usuario no existe." };
    }

    if (foundUser.password === password) {
      localStorage.setItem(SESSION_STORAGE_KEY, foundUser.tenantId);
      setTenantId(foundUser.tenantId);
      return { success: true, message: "Inicio de sesión exitoso." };
    } else {
      return { success: false, message: "Contraseña incorrecta." };
    }
  };

  const logout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setTenantId(null);
  };

  return { tenantId, login, logout };
}
