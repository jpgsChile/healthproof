// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../identity/IdentityRegistry.sol";

//  Gestiona órdenes médicas dentro del protocolo HealthProof.
//  Diseñado para flujos hospitalarios reales (consulta → orden → examen → resultado)

contract MedicalOrderRegistry {

    IdentityRegistry public identityRegistry;

    constructor(address identityAddress) {
        identityRegistry = IdentityRegistry(identityAddress);
    }

    /// Estados de una orden médica
    enum OrderStatus {
        CREATED,
        LAB_ASSIGNED,
        SAMPLE_COLLECTED,
        RESULT_READY,
        CLOSED
    }

    /// Estructura de orden médica
    struct MedicalOrder {
        address patient;
        address doctor;
        address institution;
        bytes32 episodeId;
        bytes32 orderType;
        bytes32 examType;
        address assignedLab;
        OrderStatus status;
        uint64 createdAt;
    }

    /// almacenamiento de órdenes
    mapping(bytes32 => MedicalOrder) public orders;

    /// eventos para indexadores
    event MedicalOrderCreated(
        bytes32 indexed orderId,
        address indexed patient,
        address indexed doctor,
        bytes32 episodeId,
        bytes32 examType,
        uint64 timestamp
    );

    event LabAssigned(
        bytes32 indexed orderId,
        address indexed lab,
        uint64 timestamp
    );

    event OrderStatusUpdated(
        bytes32 indexed orderId,
        OrderStatus status,
        uint64 timestamp
    );

    /// -------------------------------------
    /// MODIFIERS
    /// -------------------------------------

    modifier onlyVerified() {
        require(
            identityRegistry.isVerified(msg.sender),
            "Entidad no verificada"
        );
        _;
    }

    modifier onlyDoctor() {
        require(
            identityRegistry.getRole(msg.sender)
                == IdentityRegistry.Role.DOCTOR,
            "Solo doctores"
        );
        _;
    }

    modifier orderExists(bytes32 orderId) {
        require(
            orders[orderId].createdAt != 0,
            "Orden inexistente"
        );
        _;
    }

    /// -------------------------------------
    /// CREAR ORDEN MEDICA
    /// -------------------------------------

    function createOrder(
        bytes32 orderId,
        address patient,
        address institution,
        bytes32 episodeId,
        bytes32 orderType,
        bytes32 examType
    )
        external
        onlyVerified
        onlyDoctor
    {

        require(
            orders[orderId].createdAt == 0,
            "Orden ya existe"
        );

        orders[orderId] = MedicalOrder({
            patient: patient,
            doctor: msg.sender,
            institution: institution,
            episodeId: episodeId,
            orderType: orderType,
            examType: examType,
            assignedLab: address(0),
            status: OrderStatus.CREATED,
            createdAt: uint64(block.timestamp)
        });

        emit MedicalOrderCreated(
            orderId,
            patient,
            msg.sender,
            episodeId,
            examType,
            uint64(block.timestamp)
        );
    }

    /// -------------------------------------
    /// ASIGNAR LABORATORIO
    /// -------------------------------------

    function assignLab(
        bytes32 orderId,
        address lab
    )
        external
        orderExists(orderId)
        onlyVerified
    {

        MedicalOrder storage order = orders[orderId];

        require(
            msg.sender == order.doctor,
            "Solo el doctor puede asignar laboratorio"
        );

        require(
            identityRegistry.getRole(lab)
                == IdentityRegistry.Role.LAB,
            "Destino no es laboratorio"
        );

        order.assignedLab = lab;
        order.status = OrderStatus.LAB_ASSIGNED;
        emit LabAssigned(
            orderId,
            lab,
            uint64(block.timestamp)
        );
    }

    /// -------------------------------------
    /// ACTUALIZAR ESTADO
    /// -------------------------------------

    function updateStatus(
        bytes32 orderId,
        OrderStatus status
    )
        external
        orderExists(orderId)
        onlyVerified
    {

        MedicalOrder storage order = orders[orderId];

        /// solo laboratorio asignado o doctor
        require(
            msg.sender == order.assignedLab ||
            msg.sender == order.doctor,
            "No autorizado"
        );

        order.status = status;

        emit OrderStatusUpdated(
            orderId,
            status,
            uint64(block.timestamp)
        );
    }

    /// -------------------------------------
    /// OBTENER ORDEN
    /// -------------------------------------

    function getOrder(
        bytes32 orderId
    )
        external
        view
        orderExists(orderId)
        returns (MedicalOrder memory)
    {

        return orders[orderId];
    }
}