/**
 * Middleware de validare a datelor din cereri HTTP folosind Zod.
 *
 * Rol in arhitectura sistemului:
 *   - Valideaza body-ul cererii HTTP inainte ca acesta sa ajunga la controller.
 *   - Foloseste schemele Zod definite in fiecare modul (auth.schema, user.schema, client.schema).
 *   - Daca datele sunt valide, le parseaza (curata/transforma) si le pune inapoi pe req.body.
 *   - Daca datele sunt invalide, returneaza un raspuns 400 cu detalii despre erori.
 *
 * Flux de date:
 *   Request HTTP (req.body)  ->  schema.parse()  ->  date validate pe req.body  ->  next()
 *                                     |
 *                                     v (daca esueaza)
 *                              400 Bad Request cu detalii ZodError
 *
 * Tratarea erorilor:
 *   - ZodError: Returneaza 400 cu array de erori (cale camp + mesaj).
 *   - Alte erori: Le paseaza la middleware-ul global de erori (errorHandler).
 *
 * Cum se modifica:
 *   - Pentru a valida si query params sau params, extinde functia sa parseze
 *     si req.query / req.params, nu doar req.body.
 *   - Pentru a adauga o noua schema, creaz-o in fisierul .schema.ts al modulului
 *     si foloseste validate(noua_schema) in rute.
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * Factory function care returneaza un middleware de validare pentru o schema Zod data.
 *
 * Pasi:
 *   1. Primeste o schema Zod ca parametru.
 *   2. Returneaza un middleware Express.
 *   3. In middleware, parseaza req.body prin schema Zod.
 *   4. Daca parsarea reuseste, inlocuieste req.body cu datele parsate (curatate de
 *      campuri necunoscute, cu valori transformate) si apeleaza next().
 *   5. Daca parsarea esueaza cu ZodError, returneaza 400 cu detaliile erorilor.
 *   6. Daca apare o eroare neasteptata, o paseaza la urmatorul error handler.
 *
 * @param schema - Schema Zod folosita pentru validare (ex: loginSchema, createUserSchema)
 * @returns Middleware Express de validare
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      /* Parsam si validam body-ul cererii. Zod elimina campurile necunoscute
         si aplica transformari (ex: .trim(), .default()). */
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      /* Verificam daca eroarea este o eroare de validare Zod */
      if (err instanceof ZodError) {
        /* Returnam 400 Bad Request cu lista de erori de validare.
           Fiecare eroare contine:
             - path: calea campului invalid (ex: 'name', 'email')
             - message: mesajul de eroare (ex: 'Required', 'Invalid email') */
        res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      /* Daca nu este ZodError, pasam eroarea la middleware-ul global de erori */
      next(err);
    }
  };
}
