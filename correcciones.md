# Observaciones y correcciones para la plataforma de Kroma Lab

Esta es una lista de observaciones y correcciones que deben tenerse en cuenta.

1. En el modal de crear cuenta, debería haber un input para confirmar contraseña. La validación de contraseña debe hacerse con el input de contraseña, pero el input de confirmar contraseña debe validarse para que sea igual al input de contraseña. Debe mostrar un mensaje de error si las contraseñas no coinciden.

2. La validación de campos para el formulario de crear cuenta debe hacerse con el input, antes de enviar la petición al backend. Por ejemplo, si el usuario ingresa texto en el campo de teléfono, debe mostrarse un mensaje de error si el texto no es un número. Además, el formato de los inputs debe ser el correcto. Para no volverse molesto para el usuario, la validación debe hacerse hasta que el usuario ya dejó de escribir por 500ms.

3. Al cambiar del modal iniciar sesión al modal crear cuenta, la notificación de credenciales inválidas no desaparece. Cuando el usuario intenta inicar sesión y se da cuenta que no tiene una cuenta recibiendo el mensaje de credenciales inválidas, al dar click en crear cuenta dentro del modal, el mensaje credenciales inválidas debe desaparecer.

4. Al iniciar sesión, por un instante el modal se transforma en el modal de configuración de la cuenta y luego se cierra. El modal debería desaparecer de inmediato sin cambiar de UI.

5. Las ventanas modales se cierran al dar click fuera de ellas. Deberían cerrarse sólo al dar click al botón X en la esquina, el botón cancelar o al terminar su utilidad de iniciar sesión o crear cuenta.

6. Al cerrar el modal de iniciar sesión, se deben limpiar los input. No debe persistir la información de credenciales inválidas y se debe limpiar el correo y la contraseña.

7. No hay campo de contraseña en la página /mi-cuenta. El usuario debe poder cambiar su contraseña. Agregar un input para contraseña actual, contraseña y confirmar contraseña nueva. Esto cambiará la contraseña de la cuenta. Debe validar que la contraseña actual sea la correcta. Antes de cambiar la contraseña, el usuario debe recibir un correo electrónico de verificación.

8. El usuario debe tener forma de cambiar su correo electrónico. El correo electrónico en la página /mi-cuenta está bloqueado así que no se puede cambiar. Al cambiar el correo electrónico y dar click en guardar cambios, el usuario debe recibir un correo electrónico de verificacion en el correo nuevo. Además, antes de poder dar click en guardar cambios, el usuario debe de escribir también su contraseña actual, de lo contrario no se le permitirá cambiar de correo electrónico.

9. En el cotizador, se acepta que el usuario escriba un ancho mayor a 28cm. Cuando el usuario escriba un número mayor que 28 en el input, el input debe regresar automáticamente a 28. No debe permitir que el usuario escriba un número mayor a 28.

10. En la página de pedidos quiero que el filtro de estado de producción cambie un par de textos. "En cola audley" debe de decir "En cola de impresión", "imprimiendo UV" debe decir "Imprimiendo".

11. En pedidos, cuando el usuario es tipo cliente, al imprimir el recibo, no quiero incluir el cuadro de control de calidad. Quita esa parte, no hay razón por la que el cliente vea eso. Quita también por completo el texto "Orientar el archivo RIP idéntico a este esquema para evitar mermas o reclamos de rotación.", eso se verá bastante mal si lo lee un cliente. No hagas esos cambios si el usuario es tipo empleado o administrador.

12. En pedidos, al imprimir el recibo. En el recibo, en la cabecera, quiero que quites el texto que dice "(BOBINA AUDLEY 28CM)". El resto de la linea está bien. Quita por completo el paréntesis "(únicamente impresión, sin cobro de material)" y quita el otro paréntesis "(Barniz con Relieve 3D)". El texto "📐 Montaje Técnico en Bobina Audley (Orientación Requerida):" cambialo por "📐 Montaje en Superficie de Impresión:". "Disposición configurada sobre los 28 cm útiles de bobina." cambialo por "Disposición configurada sobre los 28 cm útiles"

13. En la página de pedidos, en el modal de imprimir pedido, sale este texto "💡 Imprime esta ficha o colócala junto a la bobina montada en la máquina.". Si el usuario es de tipo cliente, no debería poder leer ese texto, sólo un empleado o el admin deben poder leer eso. No hagas esos cambios si el usuario es tipo empleado o administrador.

14. En la página de pedidos, al estar en modo empleado o administrador, no me gusta el dropdown para controlar el estado de producción. Eso debería controlarse en el tablero de producción, en la página /producción. Necesitamos hacer varios cambios en esta parte:
  - En la columna de estado producción, quita el dropdown y deja sólo un chip diciendo el estado de producción de la orden.
  - Quita el botón "Generar guía de despacho" y en su lugar coloca un botón "Agregar a Cola de Producción".
  - Al dar click a ese botón de agregar a cola de producción, se debe enviar un email al cliente, avisando que su orden fue confirmada, y además debe agregarse a la cola de impresión en la página /producción. Debe aparecer en "1. En Cola Audley"
  - La columna "Estado producción" debe actualizarse de acuerdo al tablero kanban de la impresora en /producción.

15. En el modal que aparece después de dar click a "Enviar pedido para confirmación", en el input de "Instrucciones o notas especiales", no quiero que diga "relieve pronunciado, barniz brillante" Quita el placeholder, deja eso vacío. Cuando se trata de un usuario sin cuenta (visitor), en lugar de permitir enviar el pedido, quita ese botón y coloca el botón para abrir whatsapp y hablar con el número de la empresa. Un usuario sin cuenta no debería poder hacer un pedido. Para hacer pedidos sin cuenta, lo debe hacer un admin o empleado por medio del botón "Registrar Pedido".

16. Al agregar una cotización al carrito, no debe abrirse el carrito, debe seguir en la página del cotizador. Debe aparecer un mensaje pequeño de "Cotización agregada al carrito" en la esquina inferior derecha. No me gusta que el carrito se abra automáticamente.

17. Una mejora para el cotizador: notifiquemos al usuario si no se aprovecha una fila completa. Por ejemplo, si caben 4 stickers en la ultima fila y el usuario ingresó que quiere 21 copias, la última fila sólo tendrá 1 sticker. En este caso deberíamos indicar que la última fila no se aprovechó completamente y ofrecer la opción de pedir 24 copias por el mismo precio.

18. La opción "Guardar como cotización" en el carrito sólo guarda la cotización del primer item. La cotización debería funcionar como un placeholder del carrito. De esta forma si el cliente está de acuerdo con el precio, puede convertir el carrito en cotización, y la cotización en carrito cuando esté listo para comprar o si quiere repetir la compra en un futuro. Asegurate que la estructura de datos de la cotización sea compatible con la del carrito. De esta forma podemos reutilizar código.

19. Al dar click en el botón "ir al cotizador" en el carrito, estando en cualquier otra pagina que no sea el cotizador, no me redirige al cotizador. Corrige eso.

20. Al enviar pedido para confirmación, sólo el primer item del carrito se agrega al pedido. Como mencioné antes, asegurate que la estructura de datos de los pedidos, cotizaciones y el carrito sea la misma, de esta forma podemos simplemente guardar una cotización en el carrito y guardar el carrito como pedido. Corrige eso.