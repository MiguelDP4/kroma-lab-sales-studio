# Observaciones y correcciones para la plataforma de Kroma Lab

1. Al verificar correo electrónico aparece tanto el mensaje de "correo verificado con exito" como el mensaje de "enlace no válido o expirado". Sólo debe aparecer uno a la vez. 

2. Botón "Volver a inicio" no funciona en página de "correo verificado con exito".

3. this.activeViewCleanup is not a function aparece en el front end, el usuario no debería ver esto.

4. En la página /mi-cuenta, el input confirmar contraseña debe notificar si las contraseñas no son iguales, igual que en el input de crear cuenta.

5. El texto "Para cambiar tu correo electrónico debes ingresar tu contraseña actual." debe estar cerca del botón "Guardar Cambios" para que el usuario vea por qué no surtió efecto.

6. En la página donde dice Correo verificado con éxito, al dar click en "ver mi perfil" o en "comenzar a cotizar", no pasa nada. De hecho, al dar click en otros enlaces dentro de la página, no estoy siendo redirigido a ningún lado. Fue necesario un refresh de la página para que se recargara.

7. Al cambiar de correo electrónico, se perdieron las cotizaciones y pedidos guardados. Las cotizaciones, pedidos y demás deberían buscarse por ID del cliente, no por correo electrónico. 

8. El botón "agregar a colaproducción" no está funcionando. No sucede nada al dar click en él.

9. Al correr tus pruebas se está guardando los datos en la base de datos de staging, esa base de datos la utilizo pprobar los cambios antes de pasarlos a producción, por lo que no debe modificarse. En su lugar, utiliza una base de datos exclusiva para tests automatizados, y agrega esa regla a GEMII.md. 

10. Cuando se abre la página de pedidos después de haber cerrado sesión con un usuario distinto, la tabla de pedidos aún muestra los pedidos de la cuenta anterior, hasta que se cargan los pedidos de la cuenta actual. Lo que en realidad debería mostrar es un skeleton mientras se carga los pedidos de la cuenta actual, y el skeleton debe ocultarse cuando se cargan los pedidos de la cuenta actual.

11. Al guardar el carrito como cotización, aún se guarda sólo el primer item. No guarda las imagenes, dimensiones ni cantidades de los demás items. Vuelve a revisar el código, las cotizaciones deben tener la misma estructura de datos de los pedidos y del carrito, y al guardar el carrito como cotización se debe de poder ver todo lo que se había guardado en el carrito en la cotización guardada.

12. Al dar click al botón "vaciar carrito" aparece una alerta del navegador. Todas las alertas deben manejarse dentro del mismo sitio, con una ventana modal. En el caso de vaciar el carrito debe decir "¿Estás seguro que quieres vaciar todos los diseños de tu carrito?", con las opciones "Si" y "Cancelar". 

13. En la sección de cobranza, hay que cambiar el select con los métodos de pago. Por ahora sólo voy a aceptar transferencias bancarias o efectivo contra entrega. Al seleccionar la opción de efectivo debe esconderse o bloquearse la opción de número de boleta. Si el cliente da un anticipo diferente al 50%, no debemos escribir 50% sino el porcentaje exacto redondeado al entero más cercano.

14. En el inventario quiero tener una forma de eliminar un insumo en caso de confundirme ingresandolo. 

15. También en el inventario, los insumos que se compran son FILM de impresión (A y B vienen juntos entonces no se cuentan por separado). Tinta Cyan, Tinta Magenta, Tinta Amarilla, Tinta Negra, Tinta Blanca, Barniz se compran por separado en botes de un litro. No manejamos navajas de corte perimetral. Ajusta el select para esos y encargate de limpiar la tabla de insumos para poder empezar a llenar eso manualmente para yo hacer mis pruebas. El placeholder para proveedor, borralo, debe quedar en blanco, también el número de factura. 

16. En el inventario, encargate de revisar el código para exportar el kardex csv, que tenga los datos nuevos. 

17. En la cartera de clientes, el botón eliminar está utilizando la alerta del navegador. Como lo mencioné con el carrito, hay que usar un modal para esto y no una alerta. Encargate que el modal de confirmación de vaciar carrito y el modal de eliminar cliente sean consistentes en cuanto a diseño.

18. En la gestión de usuarios hay un modal que dice "¿Estás seguro de que deseas eliminar permanentemente a Kroma Tester (kroma.tester.changed@mailinator.com)? Esta acción no se puede deshacer.". Este modal me gusta, utilizalo como modelo para las otras dos alertas que te pedí que cambies. 

19. Quiero que el sidebar drawer ocupe el espacio de toda la pantalla en caso estemos viendo la página desde un celular. 