import { Request, Response } from 'express';
import { ProductService } from './product.service';

const productService = new ProductService();

export async function list(req: Request, res: Response): Promise<void> {
  const filters = {
    search: req.query.search as string,
    isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 50,
  };
  const result = await productService.list(req.user!.tenantId, filters);
  res.json(result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.getById(req.user!.tenantId, req.params.id);
    res.json(product);
  } catch {
    res.status(404).json({ error: 'Product not found' });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.create(req.user!.tenantId, req.body);
    res.status(201).json(product);
  } catch (err) {
    if (err instanceof Error && err.message.includes('SKU')) {
      res.status(409).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Create failed';
    res.status(400).json({ error: message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const product = await productService.update(req.user!.tenantId, req.params.id, req.body);
    res.json(product);
  } catch (err) {
    if (err instanceof Error && err.message.includes('SKU')) {
      res.status(409).json({ error: err.message });
      return;
    }
    const message = err instanceof Error ? err.message : 'Update failed';
    res.status(400).json({ error: message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const result = await productService.delete(req.user!.tenantId, req.params.id);
    if (result) {
      res.json({ success: true, softDeleted: true, product: result });
    } else {
      res.json({ success: true });
    }
  } catch {
    res.status(404).json({ error: 'Product not found' });
  }
}
