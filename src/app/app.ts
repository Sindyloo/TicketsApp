import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environments/environment';

interface TicketData {
  NRO_DE_TICKET: string;
  TIPO_TICKET: string;
  CATEGORIA: string;
  SUBCATEGORIA: string;
  SOLICITUD: string;
  DETALLE_SOLICITUD: string;
  ESTADO: string;
  AGENTE_ASIGNADO: string;
  PRIORIDAD: string;
  FECHA_CREACION: string;
}

interface SeguimientoData {
  fecha: string;
  texto: string;
}

interface Filtros {
  NRO_DE_TICKET: string;
  ESTADO: string;
}

@Component({
  selector: 'app-root',
  imports: [FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('angular-simple-app');

  // Lista de estados disponibles
  estados = [
    'Abierto',
    'Solucionado'
    // Aquí puedes agregar más estados fácilmente
  ];

  // Lista de prioridades disponibles
  prioridades = [
    'Baja',
    'Media', 
    'Alta',
    'Crítica'
  ];

  // Datos del formulario de ticket
  ticketData: TicketData = {
    NRO_DE_TICKET: '',
    TIPO_TICKET: '',
    CATEGORIA: '',
    SUBCATEGORIA: '',
    SOLICITUD: '',
    DETALLE_SOLICITUD: '',
    ESTADO: '',
    AGENTE_ASIGNADO: '',
    PRIORIDAD: '',
    FECHA_CREACION: ''
  };

  // Filtros
  filtros: Filtros = {
    NRO_DE_TICKET: '',
    ESTADO: ''
  };

  // Lista de tickets
  tickets = signal<TicketData[]>([]);
  
  // Lista de tickets filtrados (resultado de búsqueda)
  ticketsFiltrados = signal<TicketData[]>([]);

  // Datos del seguimiento
  seguimientoData: SeguimientoData = {
    fecha: '',
    texto: ''
  };

  // Lista de seguimientos
  seguimientos = signal<SeguimientoData[]>([]);

  // Control de modal
  esEdicion = false;
  ticketOriginal: TicketData | null = null;
  
  // Control de loading
  isLoading = signal(false);

  constructor(private http: HttpClient) {
    // Establecer fecha actual por defecto en formato ISO para datetime-local
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    this.ticketData.FECHA_CREACION = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    // Establecer fecha actual para seguimiento
    this.seguimientoData.fecha = `${year}-${month}-${day}T${hours}:${minutes}`;

    // Cargar datos del Google Sheets al iniciar
    this.cargarDatosDelExcel();
  }

  cargarDatosDelExcel() {
    console.log('Cargando datos del Excel...');
    
    // Crear URL para obtener datos
    const params = new URLSearchParams();
    params.append('action', 'getData');
    params.append('callback', `callback_${Date.now()}`);
    
    const url = `${environment.appsScriptUrl}?${params.toString()}`;
    console.log('URL de carga:', url);
    
    // Crear función de callback global
    const callbackName = 'callback_' + Date.now();
    (window as any)[callbackName] = (response: any) => {
      console.log('Datos recibidos completos:', response);
      console.log('Tipo de respuesta:', typeof response);
      console.log('Tiene propiedad data:', response && 'data' in response);
      console.log('Propiedad data:', response?.data);
      
      if (response && response.success && response.data) {
        console.log('Datos encontrados:', response.data.length, 'registros');
        this.tickets.set(response.data);
        // Inicialmente mostrar todos los tickets
        this.ticketsFiltrados.set(response.data);
        console.log('✅ Datos cargados exitosamente2');
      } else if (response && response.success && Array.isArray(response.data)) {
        console.log('Array vacío encontrado');
        this.tickets.set([]);
        this.ticketsFiltrados.set([]);
        console.log('✅ Lista vacía cargada');
      } else {
        console.log('❌ No se pudieron cargar los datos');
        console.log('Respuesta completa:', JSON.stringify(response, null, 2));
        
        // Si no funciona, probar con una URL más simple
        this.probarCargaSimple();
      }
      // Limpiar callback
      delete (window as any)[callbackName];
    };
    
    // Crear script para cargar datos
    const script = document.createElement('script');
    script.src = url;
    document.head.appendChild(script);
  }

  probarCargaSimple() {
    console.log('Probando carga simple...');
    
    const callbackName = 'callback_simple_' + Date.now();
    (window as any)[callbackName] = (response: any) => {
      console.log('Respuesta de prueba simple:', response);
      delete (window as any)[callbackName];
    };
    
    const url = `${environment.appsScriptUrl}?callback=${callbackName}`;
    console.log('URL de prueba simple:', url);
    
    const script = document.createElement('script');
    script.src = url;
    document.head.appendChild(script);
  }

  abrirModal() {
    this.esEdicion = false;
    console.log('🔄 Abriendo modal para nuevo ticket...');
    this.limpiarFormulario();
    // Limpiar también los seguimientos para nuevo ticket
    this.seguimientos.set([]);
    this.limpiarSeguimiento();
    console.log('✅ Formulario y seguimientos limpiados');
    this.mostrarModal();
    
    // Activar la primera pestaña después de que el modal se muestre
    setTimeout(() => {
      this.activarPrimeraPestana();
    }, 100);
  }

  editarTicket(ticket: any) {
    this.esEdicion = true;
    this.ticketOriginal = { ...ticket };
    this.ticketData = { ...ticket };
    // Cargar seguimientos desde el JSON si existe
    if (ticket.SEGUIMIENTO_JSON) {
      try {
        const seguimientos = JSON.parse(ticket.SEGUIMIENTO_JSON);
        this.seguimientos.set(seguimientos.map((seg: any) => ({
          texto: seg.segui,
          fecha: seg.fecha
        })));
      } catch (e) {
        this.seguimientos.set([]);
      }
    } else {
      this.seguimientos.set([]);
    }
    this.mostrarModal();
    
    // Activar la primera pestaña después de que el modal se muestre
    setTimeout(() => {
      this.activarPrimeraPestana();
    }, 100);
  }

  mostrarModal() {
    const modal = document.getElementById('ticketModal');
    if (modal) {
      const bootstrapModal = new (window as any).bootstrap.Modal(modal);
      bootstrapModal.show();
    }
  }

  ocultarModal() {
    const modal = document.getElementById('ticketModal');
    if (modal) {
      const bootstrapModal = (window as any).bootstrap.Modal.getInstance(modal);
      if (bootstrapModal) {
        bootstrapModal.hide();
      }
    }
  }

  guardarTicket() {
    if (this.esEdicion) {
      this.actualizarTicket();
    } else {
      this.crearTicket();
    }
  }

  crearTicket() {
    console.log('crearTicket() llamado');
    console.log('Datos del ticket:', this.ticketData);
    console.log('Datos de seguimiento:', this.seguimientos());
    
    // Validar que todos los campos estén llenos
    const camposRequeridos = [
      'NRO_DE_TICKET', 'TIPO_TICKET', 'CATEGORIA', 'SUBCATEGORIA',
      'SOLICITUD', 'DETALLE_SOLICITUD', 'ESTADO', 'AGENTE_ASIGNADO',
      'PRIORIDAD', 'FECHA_CREACION'
    ];
    
    const camposVacios = camposRequeridos.filter(campo => 
      !this.ticketData[campo as keyof TicketData]
    );
    
    if (camposVacios.length > 0) {
      console.log('Campos vacíos:', camposVacios);
      alert('Por favor llena todos los campos requeridos');
      return;
    }
    
    console.log('Todos los campos están llenos');
    
    // Activar loading
    this.isLoading.set(true);
    
    // Usar JSONP para evitar CORS
    const script = document.createElement('script');
    const callbackName = 'callback_' + Date.now();
    
    console.log('Callback name:', callbackName);
    
    // Crear función de callback global
    (window as any)[callbackName] = (response: any) => {
      console.log('🎉 CALLBACK EJECUTADO!');
      console.log('Respuesta completa:', response);
      
      // Desactivar loading
      this.isLoading.set(false);
      
      if (response && response.success) {
        // Cerrar el modal
        this.ocultarModal();
        
        // Recargar los datos del Excel
        this.cargarDatosDelExcel();
        
        console.log('✅ Ticket creado exitosamente');
        alert('¡Ticket creado y guardado en Google Sheets!');
      } else {
        console.error('❌ Error en respuesta:', response);
        alert('Error al guardar en Google Sheets');
      }
      // Limpiar
      delete (window as any)[callbackName];
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
    
    // Crear URL con todos los parámetros del ticket
    const params = new URLSearchParams();
    Object.entries(this.ticketData).forEach(([key, value]) => {
      params.append(key, value);
    });
    
    // Agregar datos de seguimiento si existen
    if (this.seguimientos().length > 0) {
      const seguimientosJSON = this.seguimientos().map((seg, index) => ({
        n: index + 1,
        segui: seg.texto,
        fecha: seg.fecha
      }));
      params.append('seguimientosJSON', JSON.stringify(seguimientosJSON));
      console.log('Seguimientos a enviar:', seguimientosJSON);
    }
    
    params.append('callback', callbackName);
    
    const url = `${environment.appsScriptUrl}?${params.toString()}`;
    
    console.log('URL creada:', url);
    
    script.src = url;
    document.head.appendChild(script);
    console.log('Script agregado al DOM');
  }

  actualizarTicket() {
    console.log('actualizarTicket() llamado');
    console.log('Datos del ticket a actualizar:', this.ticketData);
    console.log('Ticket original:', this.ticketOriginal);
    console.log('NRO_DE_TICKET original:', this.ticketOriginal?.NRO_DE_TICKET);
    console.log('Datos de seguimiento:', this.seguimientos());
    
    // Validar que todos los campos estén llenos
    const camposRequeridos = [
      'NRO_DE_TICKET', 'TIPO_TICKET', 'CATEGORIA', 'SUBCATEGORIA',
      'SOLICITUD', 'DETALLE_SOLICITUD', 'ESTADO', 'AGENTE_ASIGNADO',
      'PRIORIDAD', 'FECHA_CREACION'
    ];
    
    const camposVacios = camposRequeridos.filter(campo => 
      !this.ticketData[campo as keyof TicketData]
    );
    
    if (camposVacios.length > 0) {
      console.log('Campos vacíos:', camposVacios);
      alert('Por favor llena todos los campos requeridos');
      return;
    }
    
    console.log('Todos los campos están llenos');
    
    // Activar loading
    this.isLoading.set(true);
    
    // Usar JSONP para evitar CORS
    const script = document.createElement('script');
    const callbackName = 'callback_' + Date.now();
    
    console.log('Callback name:', callbackName);
    
    // Crear función de callback global
    (window as any)[callbackName] = (response: any) => {
      console.log('🎉 CALLBACK EJECUTADO!');
      console.log('Respuesta completa:', response);
      
      // Desactivar loading
      this.isLoading.set(false);
      
      if (response && response.success) {
        // Cerrar el modal
        this.ocultarModal();
        
        // Recargar los datos del Excel
        this.cargarDatosDelExcel();
        
        console.log('✅ Ticket actualizado exitosamente');
        alert('¡Ticket actualizado en Google Sheets!');
      } else {
        console.error('❌ Error en respuesta:', response);
        alert('Error al actualizar en Google Sheets: ' + (response?.error || 'Error desconocido'));
      }
      // Limpiar
      delete (window as any)[callbackName];
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
    
    // Crear URL con todos los parámetros del ticket
    const params = new URLSearchParams();
    Object.entries(this.ticketData).forEach(([key, value]) => {
      params.append(key, value);
    });
    
    // Agregar datos de seguimiento si existen
    if (this.seguimientos().length > 0) {
      const seguimientosJSON = this.seguimientos().map((seg, index) => ({
        n: index + 1,
        segui: seg.texto,
        fecha: seg.fecha
      }));
      params.append('seguimientosJSON', JSON.stringify(seguimientosJSON));
      console.log('Seguimientos a enviar:', seguimientosJSON);
    }
    
    // Agregar el número de ticket original para identificar qué fila actualizar
    if (this.ticketOriginal) {
      params.append('originalNroTicket', this.ticketOriginal.NRO_DE_TICKET);
      console.log('Agregando originalNroTicket:', this.ticketOriginal.NRO_DE_TICKET);
    }
    params.append('callback', callbackName);
    
    const url = `${environment.appsScriptUrl}?${params.toString()}`;
    
    console.log('URL creada:', url);
    
    script.src = url;
    document.head.appendChild(script);
    console.log('Script agregado al DOM');
  }

  limpiarFiltros() {
    this.filtros = {
      NRO_DE_TICKET: '',
      ESTADO: ''
    };
    
    // Mostrar todos los tickets cuando se limpien los filtros
    this.ticketsFiltrados.set(this.tickets());
    console.log('Filtros limpiados. Mostrando todos los tickets:', this.tickets().length);
  }

  buscarTickets() {
    console.log('Ejecutando filtrado manual...');
    console.log('Filtros actuales:', this.filtros);
    console.log('Total de tickets disponibles:', this.tickets().length);
    
    // Aplicar filtros manualmente
    const ticketsFiltrados = this.tickets().filter(ticket => {
      // Filtro por NRO DE TICKET
      const nroTicketMatch = !this.filtros.NRO_DE_TICKET || 
        (ticket.NRO_DE_TICKET && 
         ticket.NRO_DE_TICKET.toString().toLowerCase().includes(this.filtros.NRO_DE_TICKET.toLowerCase()));
      
      // Filtro por ESTADO
      const estadoMatch = !this.filtros.ESTADO || 
        (ticket.ESTADO && ticket.ESTADO === this.filtros.ESTADO);
      
      return nroTicketMatch && estadoMatch;
    });
    
    // Actualizar la lista filtrada
    this.ticketsFiltrados.set(ticketsFiltrados);
    
    console.log('Filtrado completado. Tickets encontrados:', ticketsFiltrados.length);
  }

  limpiarFormulario() {
    // Establecer fecha actual por defecto en formato ISO para datetime-local
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const fechaActual = `${year}-${month}-${day}T${hours}:${minutes}`;

    this.ticketData = {
      NRO_DE_TICKET: '',
      TIPO_TICKET: '',
      CATEGORIA: '',
      SUBCATEGORIA: '',
      SOLICITUD: '',
      DETALLE_SOLICITUD: '',
      ESTADO: '',
      AGENTE_ASIGNADO: '',
      PRIORIDAD: '',
      FECHA_CREACION: fechaActual
    };
    console.log('Formulario limpiado');
  }

  agregarSeguimiento() {
    console.log('Agregando seguimiento:', this.seguimientoData);
    
    // Validar que los campos estén llenos
    if (!this.seguimientoData.fecha || !this.seguimientoData.texto.trim()) {
      alert('Por favor llena la fecha y el texto del seguimiento');
      return;
    }
    
    // Agregar el seguimiento a la lista
    this.seguimientos.update(seguimientos => [
      ...seguimientos,
      { ...this.seguimientoData }
    ]);
    
    // Limpiar el formulario
    this.limpiarSeguimiento();
    
    console.log('✅ Seguimiento agregado exitosamente');
  }

  limpiarSeguimiento() {
    // Establecer fecha actual para seguimiento
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const fechaActual = `${year}-${month}-${day}T${hours}:${minutes}`;

    this.seguimientoData = {
      fecha: fechaActual,
      texto: ''
    };
  }

  activarPrimeraPestana() {
    // Activar la primera pestaña (Datos del Ticket)
    const primeraPestana = document.getElementById('datos-tab');
    const primeraPestanaContent = document.getElementById('datos');
    
    if (primeraPestana && primeraPestanaContent) {
      // Remover clases activas de todas las pestañas
      const todasLasPestanas = document.querySelectorAll('.nav-link');
      const todosLosContenidos = document.querySelectorAll('.tab-pane');
      
      todasLasPestanas.forEach(pestana => {
        pestana.classList.remove('active');
        pestana.setAttribute('aria-selected', 'false');
      });
      
      todosLosContenidos.forEach(contenido => {
        contenido.classList.remove('show', 'active');
      });
      
      // Activar la primera pestaña
      primeraPestana.classList.add('active');
      primeraPestana.setAttribute('aria-selected', 'true');
      primeraPestanaContent.classList.add('show', 'active');
    }
  }
}
