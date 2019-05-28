// Code generated by protoc-gen-go. DO NOT EDIT.
// source: gql_configuration.proto

package gqlconfig

import (
	context "context"
	fmt "fmt"
	proto "github.com/golang/protobuf/proto"
	grpc "google.golang.org/grpc"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
	math "math"
)

// Reference imports to suppress errors if they are not otherwise used.
var _ = proto.Marshal
var _ = fmt.Errorf
var _ = math.Inf

// This is a compile-time assertion to ensure that this generated file
// is compatible with the proto package it is being compiled against.
// A compilation error at this line likely means your copy of the
// proto package needs to be updated.
const _ = proto.ProtoPackageIsVersion3 // please upgrade the proto package

type GqlConfigurationSubscribeParams struct {
	XXX_NoUnkeyedLiteral struct{} `json:"-"`
	XXX_unrecognized     []byte   `json:"-"`
	XXX_sizecache        int32    `json:"-"`
}

func (m *GqlConfigurationSubscribeParams) Reset()         { *m = GqlConfigurationSubscribeParams{} }
func (m *GqlConfigurationSubscribeParams) String() string { return proto.CompactTextString(m) }
func (*GqlConfigurationSubscribeParams) ProtoMessage()    {}
func (*GqlConfigurationSubscribeParams) Descriptor() ([]byte, []int) {
	return fileDescriptor_c11b78add49bf2c8, []int{0}
}

func (m *GqlConfigurationSubscribeParams) XXX_Unmarshal(b []byte) error {
	return xxx_messageInfo_GqlConfigurationSubscribeParams.Unmarshal(m, b)
}
func (m *GqlConfigurationSubscribeParams) XXX_Marshal(b []byte, deterministic bool) ([]byte, error) {
	return xxx_messageInfo_GqlConfigurationSubscribeParams.Marshal(b, m, deterministic)
}
func (m *GqlConfigurationSubscribeParams) XXX_Merge(src proto.Message) {
	xxx_messageInfo_GqlConfigurationSubscribeParams.Merge(m, src)
}
func (m *GqlConfigurationSubscribeParams) XXX_Size() int {
	return xxx_messageInfo_GqlConfigurationSubscribeParams.Size(m)
}
func (m *GqlConfigurationSubscribeParams) XXX_DiscardUnknown() {
	xxx_messageInfo_GqlConfigurationSubscribeParams.DiscardUnknown(m)
}

var xxx_messageInfo_GqlConfigurationSubscribeParams proto.InternalMessageInfo

type GqlConfigurationMessage struct {
	Schema               *GqlSchema `protobuf:"bytes,1,opt,name=schema,proto3" json:"schema,omitempty"`
	XXX_NoUnkeyedLiteral struct{}   `json:"-"`
	XXX_unrecognized     []byte     `json:"-"`
	XXX_sizecache        int32      `json:"-"`
}

func (m *GqlConfigurationMessage) Reset()         { *m = GqlConfigurationMessage{} }
func (m *GqlConfigurationMessage) String() string { return proto.CompactTextString(m) }
func (*GqlConfigurationMessage) ProtoMessage()    {}
func (*GqlConfigurationMessage) Descriptor() ([]byte, []int) {
	return fileDescriptor_c11b78add49bf2c8, []int{1}
}

func (m *GqlConfigurationMessage) XXX_Unmarshal(b []byte) error {
	return xxx_messageInfo_GqlConfigurationMessage.Unmarshal(m, b)
}
func (m *GqlConfigurationMessage) XXX_Marshal(b []byte, deterministic bool) ([]byte, error) {
	return xxx_messageInfo_GqlConfigurationMessage.Marshal(b, m, deterministic)
}
func (m *GqlConfigurationMessage) XXX_Merge(src proto.Message) {
	xxx_messageInfo_GqlConfigurationMessage.Merge(m, src)
}
func (m *GqlConfigurationMessage) XXX_Size() int {
	return xxx_messageInfo_GqlConfigurationMessage.Size(m)
}
func (m *GqlConfigurationMessage) XXX_DiscardUnknown() {
	xxx_messageInfo_GqlConfigurationMessage.DiscardUnknown(m)
}

var xxx_messageInfo_GqlConfigurationMessage proto.InternalMessageInfo

func (m *GqlConfigurationMessage) GetSchema() *GqlSchema {
	if m != nil {
		return m.Schema
	}
	return nil
}

type GqlSchema struct {
	Gql                  string   `protobuf:"bytes,1,opt,name=gql,proto3" json:"gql,omitempty"`
	XXX_NoUnkeyedLiteral struct{} `json:"-"`
	XXX_unrecognized     []byte   `json:"-"`
	XXX_sizecache        int32    `json:"-"`
}

func (m *GqlSchema) Reset()         { *m = GqlSchema{} }
func (m *GqlSchema) String() string { return proto.CompactTextString(m) }
func (*GqlSchema) ProtoMessage()    {}
func (*GqlSchema) Descriptor() ([]byte, []int) {
	return fileDescriptor_c11b78add49bf2c8, []int{2}
}

func (m *GqlSchema) XXX_Unmarshal(b []byte) error {
	return xxx_messageInfo_GqlSchema.Unmarshal(m, b)
}
func (m *GqlSchema) XXX_Marshal(b []byte, deterministic bool) ([]byte, error) {
	return xxx_messageInfo_GqlSchema.Marshal(b, m, deterministic)
}
func (m *GqlSchema) XXX_Merge(src proto.Message) {
	xxx_messageInfo_GqlSchema.Merge(m, src)
}
func (m *GqlSchema) XXX_Size() int {
	return xxx_messageInfo_GqlSchema.Size(m)
}
func (m *GqlSchema) XXX_DiscardUnknown() {
	xxx_messageInfo_GqlSchema.DiscardUnknown(m)
}

var xxx_messageInfo_GqlSchema proto.InternalMessageInfo

func (m *GqlSchema) GetGql() string {
	if m != nil {
		return m.Gql
	}
	return ""
}

func init() {
	proto.RegisterType((*GqlConfigurationSubscribeParams)(nil), "gqlconfig.GqlConfigurationSubscribeParams")
	proto.RegisterType((*GqlConfigurationMessage)(nil), "gqlconfig.GqlConfigurationMessage")
	proto.RegisterType((*GqlSchema)(nil), "gqlconfig.GqlSchema")
}

func init() { proto.RegisterFile("gql_configuration.proto", fileDescriptor_c11b78add49bf2c8) }

var fileDescriptor_c11b78add49bf2c8 = []byte{
	// 179 bytes of a gzipped FileDescriptorProto
	0x1f, 0x8b, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xff, 0xe2, 0x12, 0x4f, 0x2f, 0xcc, 0x89,
	0x4f, 0xce, 0xcf, 0x4b, 0xcb, 0x4c, 0x2f, 0x2d, 0x4a, 0x2c, 0xc9, 0xcc, 0xcf, 0xd3, 0x2b, 0x28,
	0xca, 0x2f, 0xc9, 0x17, 0xe2, 0x4c, 0x2f, 0xcc, 0x81, 0x88, 0x2b, 0x29, 0x72, 0xc9, 0xbb, 0x17,
	0xe6, 0x38, 0x23, 0x2b, 0x0a, 0x2e, 0x4d, 0x2a, 0x4e, 0x2e, 0xca, 0x4c, 0x4a, 0x0d, 0x48, 0x2c,
	0x4a, 0xcc, 0x2d, 0x56, 0x72, 0xe7, 0x12, 0x47, 0x57, 0xe2, 0x9b, 0x5a, 0x5c, 0x9c, 0x98, 0x9e,
	0x2a, 0xa4, 0xc3, 0xc5, 0x56, 0x9c, 0x9c, 0x91, 0x9a, 0x9b, 0x28, 0xc1, 0xa8, 0xc0, 0xa8, 0xc1,
	0x6d, 0x24, 0xa2, 0x07, 0x37, 0x59, 0xcf, 0xbd, 0x30, 0x27, 0x18, 0x2c, 0x17, 0x04, 0x55, 0xa3,
	0x24, 0xcb, 0xc5, 0x09, 0x17, 0x14, 0x12, 0xe0, 0x62, 0x4e, 0x2f, 0xcc, 0x01, 0xeb, 0xe3, 0x0c,
	0x02, 0x31, 0x8d, 0x8a, 0xb9, 0x04, 0xd0, 0xed, 0x11, 0x8a, 0xe7, 0xe2, 0x84, 0x3b, 0x47, 0x48,
	0x0b, 0xd5, 0x74, 0x7c, 0x8e, 0x96, 0x52, 0xc2, 0xa3, 0x16, 0xea, 0x7a, 0x25, 0x06, 0x03, 0xc6,
	0x24, 0x36, 0x70, 0x88, 0x18, 0x03, 0x02, 0x00, 0x00, 0xff, 0xff, 0x43, 0x2d, 0xf4, 0x77, 0x2c,
	0x01, 0x00, 0x00,
}

// Reference imports to suppress errors if they are not otherwise used.
var _ context.Context
var _ grpc.ClientConn

// This is a compile-time assertion to ensure that this generated file
// is compatible with the grpc package it is being compiled against.
const _ = grpc.SupportPackageIsVersion4

// GqlConfigurationClient is the client API for GqlConfiguration service.
//
// For semantics around ctx use and closing/ending streaming RPCs, please refer to https://godoc.org/google.golang.org/grpc#ClientConn.NewStream.
type GqlConfigurationClient interface {
	Subscribe(ctx context.Context, in *GqlConfigurationSubscribeParams, opts ...grpc.CallOption) (GqlConfiguration_SubscribeClient, error)
}

type gqlConfigurationClient struct {
	cc *grpc.ClientConn
}

func NewGqlConfigurationClient(cc *grpc.ClientConn) GqlConfigurationClient {
	return &gqlConfigurationClient{cc}
}

func (c *gqlConfigurationClient) Subscribe(ctx context.Context, in *GqlConfigurationSubscribeParams, opts ...grpc.CallOption) (GqlConfiguration_SubscribeClient, error) {
	stream, err := c.cc.NewStream(ctx, &_GqlConfiguration_serviceDesc.Streams[0], "/gqlconfig.GqlConfiguration/Subscribe", opts...)
	if err != nil {
		return nil, err
	}
	x := &gqlConfigurationSubscribeClient{stream}
	if err := x.ClientStream.SendMsg(in); err != nil {
		return nil, err
	}
	if err := x.ClientStream.CloseSend(); err != nil {
		return nil, err
	}
	return x, nil
}

type GqlConfiguration_SubscribeClient interface {
	Recv() (*GqlConfigurationMessage, error)
	grpc.ClientStream
}

type gqlConfigurationSubscribeClient struct {
	grpc.ClientStream
}

func (x *gqlConfigurationSubscribeClient) Recv() (*GqlConfigurationMessage, error) {
	m := new(GqlConfigurationMessage)
	if err := x.ClientStream.RecvMsg(m); err != nil {
		return nil, err
	}
	return m, nil
}

// GqlConfigurationServer is the server API for GqlConfiguration service.
type GqlConfigurationServer interface {
	Subscribe(*GqlConfigurationSubscribeParams, GqlConfiguration_SubscribeServer) error
}

// UnimplementedGqlConfigurationServer can be embedded to have forward compatible implementations.
type UnimplementedGqlConfigurationServer struct {
}

func (*UnimplementedGqlConfigurationServer) Subscribe(req *GqlConfigurationSubscribeParams, srv GqlConfiguration_SubscribeServer) error {
	return status.Errorf(codes.Unimplemented, "method Subscribe not implemented")
}

func RegisterGqlConfigurationServer(s *grpc.Server, srv GqlConfigurationServer) {
	s.RegisterService(&_GqlConfiguration_serviceDesc, srv)
}

func _GqlConfiguration_Subscribe_Handler(srv interface{}, stream grpc.ServerStream) error {
	m := new(GqlConfigurationSubscribeParams)
	if err := stream.RecvMsg(m); err != nil {
		return err
	}
	return srv.(GqlConfigurationServer).Subscribe(m, &gqlConfigurationSubscribeServer{stream})
}

type GqlConfiguration_SubscribeServer interface {
	Send(*GqlConfigurationMessage) error
	grpc.ServerStream
}

type gqlConfigurationSubscribeServer struct {
	grpc.ServerStream
}

func (x *gqlConfigurationSubscribeServer) Send(m *GqlConfigurationMessage) error {
	return x.ServerStream.SendMsg(m)
}

var _GqlConfiguration_serviceDesc = grpc.ServiceDesc{
	ServiceName: "gqlconfig.GqlConfiguration",
	HandlerType: (*GqlConfigurationServer)(nil),
	Methods:     []grpc.MethodDesc{},
	Streams: []grpc.StreamDesc{
		{
			StreamName:    "Subscribe",
			Handler:       _GqlConfiguration_Subscribe_Handler,
			ServerStreams: true,
		},
	},
	Metadata: "gql_configuration.proto",
}
