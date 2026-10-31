import { Router } from 'express';
import {
  listQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  convertToOrder,
  deleteQuote,
} from '../controllers/quotes.controller';
import { authenticate, optionalAuthenticate, requireRole } from '../middlewares/auth';

const router = Router();

// Listar cotizaciones guardadas (Solo usuarios autenticados: CUSTOMER ve las suyas, ADMIN/EMPLOYEE ven todas)
router.get('/', authenticate, listQuotes);

// Obtener detalle de cotización por ID o código
router.get('/:id', optionalAuthenticate, getQuoteById);

// Guardar nueva cotización
router.post('/', optionalAuthenticate, createQuote);

// Actualizar datos de cotización (Solo usuarios autenticados)
router.put('/:id', authenticate, updateQuote);

// Convertir cotización directamente a orden de producción (Solo Administrador y Personal de Taller)
router.post('/:id/convert', authenticate, requireRole('ADMIN', 'EMPLOYEE'), convertToOrder);

// Eliminar cotización guardada (Solo usuarios autenticados)
router.delete('/:id', authenticate, deleteQuote);

export default router;
